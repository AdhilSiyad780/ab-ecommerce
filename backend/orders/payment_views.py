import razorpay
from razorpay.errors import SignatureVerificationError
from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from catalog.models import Product
from .models import Order, Payment
from .serializers import OrderSerializer


def get_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def mark_order_paid(payment, provider_payment_id):
    """Shared by the client-side verification call and the webhook, so
    whichever one arrives first wins and the other is a safe no-op. This
    matters because both paths WILL fire in normal operation — the browser
    callback typically arrives first, the webhook arrives moments later as
    Razorpay's own reliability backstop in case the browser closed before
    its callback ran."""
    if payment.status == Order.PaymentStatus.PAID:
        return payment.order
    payment.provider_payment_id = provider_payment_id
    payment.status = Order.PaymentStatus.PAID
    payment.save()
    order = payment.order
    order.payment_status = Order.PaymentStatus.PAID
    if order.status == Order.Status.PLACED:
        order.status = Order.Status.CONFIRMED
    order.save()
    return order


def mark_order_payment_failed(payment):
    payment.status = Order.PaymentStatus.FAILED
    payment.save()
    order = payment.order
    if order.payment_status != Order.PaymentStatus.PAID:
        order.payment_status = Order.PaymentStatus.FAILED
        order.save()
    return order


def release_unpaid_order(order):
    """Called when a customer abandons the Razorpay checkout (closes the
    modal, or the payment fails) rather than completing it. The order was
    already created and stock already decremented at that point — without
    this, every abandoned payment attempt would leave stock permanently
    reserved for an order that's never going to be paid, and a retry would
    decrement stock a second time for the same items."""
    if order.status in (Order.Status.CANCELLED, Order.Status.DELIVERED):
        return order
    with transaction.atomic():
        for item in order.items.all():
            Product.objects.filter(id=item.product_id).update(stock=F("stock") + item.qty)
        order.status = Order.Status.CANCELLED
        order.save()
    return order


class CreateRazorpayOrderView(APIView):
    """POST { order_id } -> a Razorpay order the frontend opens in Razorpay's
    Checkout widget. Card/UPI details are entered on Razorpay's own hosted
    page and never touch our server."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        order = Order.objects.filter(id=order_id, user=request.user).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)
        if order.payment_method != Order.PaymentMethod.ONLINE:
            return Response({"error": "This order is not set up for online payment"}, status=400)

        client = get_client()
        rp_order = client.order.create({
            "amount": order.total * 100,  # paise
            "currency": "INR",
            "receipt": order.order_number,
        })

        Payment.objects.update_or_create(
            order=order,
            defaults={"provider_order_id": rp_order["id"], "amount": order.total},
        )

        return Response({
            "razorpay_order_id": rp_order["id"],
            "amount": rp_order["amount"],
            "currency": rp_order["currency"],
            "key_id": settings.RAZORPAY_KEY_ID,
        })


class VerifyRazorpayPaymentView(APIView):
    """
    POST { order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature }

    Called from the browser the instant Razorpay's Checkout widget reports
    success, so the customer sees a confirmed order immediately instead of
    waiting on the webhook (which is reliable but can lag by a few seconds).
    We still verify the signature ourselves here — the checkout widget
    reporting "success" to the browser is not proof of payment on its own,
    since a browser can be tampered with; the signature is.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        razorpay_payment_id = request.data.get("razorpay_payment_id")
        razorpay_order_id = request.data.get("razorpay_order_id")
        razorpay_signature = request.data.get("razorpay_signature")

        order = Order.objects.filter(id=order_id, user=request.user).first()
        if not order:
            return Response({"error": "Order not found"}, status=404)

        payment = getattr(order, "payment", None)
        if not payment or payment.provider_order_id != razorpay_order_id:
            return Response({"error": "Payment record mismatch"}, status=400)

        try:
            get_client().utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
        except SignatureVerificationError:
            return Response({"error": "Payment verification failed"}, status=400)

        order = mark_order_paid(payment, razorpay_payment_id)
        return Response(OrderSerializer(order).data)


class RazorpayWebhookView(APIView):
    """Razorpay calls this after a payment succeeds/fails. We verify the
    signature ourselves rather than trusting the frontend's 'payment done'
    callback — that's what stops someone from faking a successful payment
    by calling our API directly. This is also our reliability backstop:
    it fires independently of whether the customer's browser was still
    open when the payment completed."""
    permission_classes = [AllowAny]

    def post(self, request):
        signature = request.headers.get("X-Razorpay-Signature", "")
        body = request.body

        try:
            get_client().utility.verify_webhook_signature(
                body.decode(), signature, settings.RAZORPAY_WEBHOOK_SECRET
            )
        except SignatureVerificationError:
            return Response({"error": "Invalid signature"}, status=400)

        event = request.data
        event_type = event.get("event")

        if event_type == "payment.captured":
            payload = event["payload"]["payment"]["entity"]
            payment = Payment.objects.filter(provider_order_id=payload["order_id"]).first()
            if payment:
                mark_order_paid(payment, payload["id"])

        elif event_type == "payment.failed":
            payload = event["payload"]["payment"]["entity"]
            payment = Payment.objects.filter(provider_order_id=payload["order_id"]).first()
            if payment:
                order = mark_order_payment_failed(payment)
                release_unpaid_order(order)

        return Response({"ok": True})