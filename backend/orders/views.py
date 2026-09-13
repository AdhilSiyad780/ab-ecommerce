import random
import logging
import razorpay
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Address
from delivery.models import Apartment, DeliverySlot
from catalog.models import Product
from discounts.engine import price_cart, PricingError
from discounts.models import Coupon, CouponUsage
from accounts.permissions import IsAdminRole
from .models import Order, OrderItem, Payment
from .serializers import OrderSerializer, PlaceOrderSerializer, UpdateOrderStatusSerializer

logger = logging.getLogger(__name__)

# Matches the sequence shown in the admin "Orders" timeline / customer tracker.
STATUS_SEQUENCE = [
    Order.Status.PLACED, Order.Status.CONFIRMED, Order.Status.PREPARING,
    Order.Status.PACKED, Order.Status.OUT_FOR_DELIVERY, Order.Status.DELIVERED,
]


def generate_order_number():
    stamp = timezone.now().strftime("%Y%m%d")
    for _ in range(5):
        candidate = f"VEG-{stamp}-{random.randint(1000, 9999)}"
        if not Order.objects.filter(order_number=candidate).exists():
            return candidate
    raise PricingError("Could not generate a unique order number, please retry")


# Statuses a customer can self-service cancel. Once an order enters
# PREPARING, packing has effectively begun and cancellation needs a human
# (admin) decision — this matches what the frontend's Cancel button already
# shows, but is enforced here too, since the frontend hiding a button is not
# a security boundary: a stale cache, a race with an admin action, or a
# direct API call could otherwise cancel an order that's already packed.
CUSTOMER_CANCELLABLE_STATUSES = {Order.Status.PLACED, Order.Status.CONFIRMED}


def cancel_order_with_refund(order):
    """
    Cancels an order: restocks its items, and — if it was already paid
    online — attempts a Razorpay refund automatically.

    Returns (order, refund_warning). refund_warning is None if there was
    nothing to refund or the refund succeeded; otherwise it's a message for
    the admin explaining that a manual refund is needed and why the
    automatic one didn't happen. We still cancel the order either way —
    fulfilment should stop regardless of whether the refund API call
    succeeded, and money left in limbo is safer surfaced loudly to an admin
    than silently retried against payment infrastructure we don't control.
    """
    refund_warning = None
    with transaction.atomic():
        for item in order.items.all():
            Product.objects.filter(id=item.product_id).update(stock=F("stock") + item.qty)

        order.status = Order.Status.CANCELLED

        if order.payment_method == Order.PaymentMethod.ONLINE and order.payment_status == Order.PaymentStatus.PAID:
            try:
                payment = order.payment
            except Payment.DoesNotExist:
                payment = None

            if payment and payment.provider_payment_id:
                try:
                    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                    client.payment.refund(payment.provider_payment_id, {"amount": order.total * 100})
                    order.payment_status = Order.PaymentStatus.REFUNDED
                    payment.status = Order.PaymentStatus.REFUNDED
                    payment.save()
                except Exception as e:
                    logger.error("Razorpay refund failed for order %s: %s", order.order_number, e)
                    refund_warning = (
                        f"Order was cancelled and stock restored, but the automatic refund failed. "
                        f"Please refund ₹{order.total} manually via the Razorpay dashboard. ({e})"
                    )
            else:
                refund_warning = (
                    f"Order was cancelled and stock restored, but no payment record was found to refund "
                    f"automatically. Please verify in Razorpay and refund ₹{order.total} manually if the "
                    f"customer was charged."
                )

        order.save()
    return order, refund_warning


class OrderViewSet(viewsets.ModelViewSet):
    """
    Customer-facing: GET (own orders only), POST (place order), and a
    /cancel/ action. Admin-facing order management is a separate viewset
    below so permissions never get mixed up between the two roles.
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head"]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")

    def create(self, request, *args, **kwargs):
        req = PlaceOrderSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        data = req.validated_data

        try:
            with transaction.atomic():
                # Re-price on the server inside the transaction — the client's
                # numbers (if it sent any) are never trusted.
                pricing = price_cart(
                    data["lines"],
                    apartment_id=data["apartment_id"],
                    coupon_code=data.get("coupon_code"),
                    user=request.user,
                )
                if pricing.coupon_error:
                    return Response({"error": pricing.coupon_error}, status=400)

                address = Address.objects.get(id=data["address_id"], user=request.user)
                apartment = Apartment.objects.select_for_update().get(id=data["apartment_id"])
                slot = DeliverySlot.objects.get(id=data["slot_id"])

                if not apartment.enabled:
                    return Response({"error": "Delivery is currently unavailable for this apartment"}, status=400)
                if pricing.subtotal < apartment.min_order_value:
                    return Response(
                        {"error": f"Minimum order value for this apartment is ₹{apartment.min_order_value}"},
                        status=400,
                    )

                # Lock and decrement stock row-by-row; fails atomically if anything runs out.
                for line in pricing.lines:
                    updated = Product.objects.filter(
                        id=line.product_id, stock__gte=line.qty
                    ).update(stock=F("stock") - line.qty)
                    if updated == 0:
                        raise PricingError(f"{line.name} just went out of stock — please update your cart")

                order = Order.objects.create(
                    order_number=generate_order_number(),
                    user=request.user,
                    address=address,
                    apartment=apartment,
                    slot=slot,
                    delivery_date=timezone.now().date(),
                    subtotal=pricing.subtotal_mrp,
                    product_discount=pricing.product_discount,
                    combo_discount=pricing.combo_discount,
                    coupon_code=pricing.coupon_code,
                    coupon_discount=pricing.coupon_discount,
                    delivery_charge=pricing.delivery_charge,
                    total=pricing.grand_total,
                    payment_method=data["payment_method"],
                    payment_status=Order.PaymentStatus.PENDING,
                    status=Order.Status.PLACED,
                )
                OrderItem.objects.bulk_create([
                    OrderItem(
                        order=order, product_id=l.product_id, product_name=l.name,
                        unit=l.unit, qty=l.qty, unit_price=l.sale_price, line_total=l.line_total,
                    ) for l in pricing.lines
                ])

                if pricing.coupon_code:
                    coupon = Coupon.objects.get(code=pricing.coupon_code)
                    CouponUsage.objects.create(coupon=coupon, user=request.user, order=order)

        except PricingError as e:
            return Response({"error": str(e)}, status=400)
        except Address.DoesNotExist:
            return Response({"error": "Address not found"}, status=400)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status in (Order.Status.DELIVERED, Order.Status.CANCELLED):
            return Response({"error": f"Order already {order.status.lower()}"}, status=400)
        if order.status not in CUSTOMER_CANCELLABLE_STATUSES:
            return Response(
                {"error": f"This order is already {order.get_status_display().lower()} and can no longer be "
                          f"cancelled online. Please contact support if you need to change it."},
                status=400,
            )
        order, _ = cancel_order_with_refund(order)
        return Response(OrderSerializer(order).data)


class AdminOrderViewSet(viewsets.ModelViewSet):
    """Admin → Orders. Staff-only. Supports status filters and a
    /advance_status/ action that walks an order through the fixed
    PLACED -> ... -> DELIVERED sequence, matching the admin dashboard's
    'Mark <next status>' button."""
    queryset = Order.objects.select_related("user", "apartment", "slot").prefetch_related("items").all()
    serializer_class = OrderSerializer
    permission_classes = [IsAdminRole]
    http_method_names = ["get", "post", "head"]
    filterset_fields = ["status", "payment_method", "apartment"]

    @action(detail=True, methods=["post"])
    def advance_status(self, request, pk=None):
        order = self.get_object()
        if order.status == Order.Status.CANCELLED:
            return Response({"error": "Cannot advance a cancelled order"}, status=400)
        idx = STATUS_SEQUENCE.index(order.status)
        if idx >= len(STATUS_SEQUENCE) - 1:
            return Response({"error": "Order is already delivered"}, status=400)
        order.status = STATUS_SEQUENCE[idx + 1]
        if order.payment_method == Order.PaymentMethod.COD and order.status == Order.Status.DELIVERED:
            order.payment_status = Order.PaymentStatus.PAID
        order.save()
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status in (Order.Status.DELIVERED, Order.Status.CANCELLED):
            return Response({"error": f"Order already {order.status.lower()}"}, status=400)
        order, refund_warning = cancel_order_with_refund(order)
        data = OrderSerializer(order).data
        if refund_warning:
            data["refund_warning"] = refund_warning
        return Response(data)