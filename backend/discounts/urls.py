from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CouponViewSet, ComboViewSet, DiscountRuleConfigView, PriceCartView

router = DefaultRouter()
router.register("coupons", CouponViewSet, basename="coupon")
router.register("combos", ComboViewSet, basename="combo")

urlpatterns = [
    path("rules/", DiscountRuleConfigView.as_view(), name="discount-rules"),
    path("price-cart/", PriceCartView.as_view(), name="price-cart"),
    path("", include(router.urls)),
]
