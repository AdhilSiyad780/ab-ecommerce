from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import OrderViewSet, AdminOrderViewSet
from .payment_views import CreateRazorpayOrderView, VerifyRazorpayPaymentView, RazorpayWebhookView

router = DefaultRouter()
router.register("", OrderViewSet, basename="order")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("payments/razorpay/create/", CreateRazorpayOrderView.as_view(), name="razorpay-create"),
    path("payments/razorpay/verify/", VerifyRazorpayPaymentView.as_view(), name="razorpay-verify"),
    path("payments/razorpay/webhook/", RazorpayWebhookView.as_view(), name="razorpay-webhook"),
] + router.urls