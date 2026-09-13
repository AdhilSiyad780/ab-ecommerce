from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from dataclasses import asdict
from .models import Coupon, Combo, DiscountRuleConfig
from .serializers import (
    CouponSerializer, ComboSerializer, DiscountRuleConfigSerializer, PriceCartRequestSerializer,
)
from .engine import price_cart, PricingError
from accounts.permissions import IsAdminOrReadOnly, IsAdminRole


class CouponViewSet(viewsets.ModelViewSet):
    """Public GET lets the storefront show 'available coupons' on the profile page;
    only admins can create/edit/deactivate."""
    queryset = Coupon.objects.all().order_by("-id")
    serializer_class = CouponSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_authenticated and self.request.user.is_admin_role()):
            qs = qs.filter(active=True)
        return qs


class ComboViewSet(viewsets.ModelViewSet):
    queryset = Combo.objects.prefetch_related("items__product").all()
    serializer_class = ComboSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_authenticated and self.request.user.is_admin_role()):
            qs = qs.filter(active=True)
        return qs


class DiscountRuleConfigView(APIView):
    """GET is public (frontend can explain why a coupon was rejected);
    PATCH is admin-only — this is the "Discount Rules" toggle panel."""
    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [IsAdminRole()]

    def get(self, request):
        return Response(DiscountRuleConfigSerializer(DiscountRuleConfig.current()).data)

    def patch(self, request):
        obj = DiscountRuleConfig.current()
        serializer = DiscountRuleConfigSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PriceCartView(APIView):
    """POST { apartment_id, coupon_code?, lines: [{product_id, qty}] }
    -> full pricing breakdown. Called live from the cart drawer on every
    quantity change / coupon entry, and again (independently) at checkout."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        req = PriceCartRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        try:
            result = price_cart(
                req.validated_data["lines"],
                apartment_id=req.validated_data["apartment_id"],
                coupon_code=req.validated_data.get("coupon_code"),
                user=request.user if request.user.is_authenticated else None,
            )
        except PricingError as e:
            return Response({"error": str(e)}, status=400)

        return Response({
            "lines": [asdict(l) for l in result.lines],
            "subtotal_mrp": result.subtotal_mrp,
            "subtotal": result.subtotal,
            "product_discount": result.product_discount,
            "matched_combos": result.matched_combos,
            "combo_discount": result.combo_discount,
            "coupon_code": result.coupon_code,
            "coupon_discount": result.coupon_discount,
            "coupon_error": result.coupon_error,
            "delivery_charge": result.delivery_charge,
            "grand_total": result.grand_total,
        })
