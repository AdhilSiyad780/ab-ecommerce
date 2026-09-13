from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "unit", "qty", "unit_price", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    apartment_name = serializers.CharField(source="apartment.name", read_only=True)
    slot_label = serializers.CharField(source="slot.label", read_only=True)
    customer_name = serializers.CharField(source="user.name", read_only=True)
    customer_mobile = serializers.CharField(source="user.mobile", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "customer_name", "customer_mobile",
            "address", "apartment", "apartment_name", "slot", "slot_label", "delivery_date",
            "subtotal", "product_discount", "combo_discount", "coupon_code", "coupon_discount",
            "delivery_charge", "total", "payment_method", "payment_status", "status",
            "created_at", "updated_at", "items",
        ]
        read_only_fields = fields  # orders are never edited directly — only through actions below


class PlaceOrderSerializer(serializers.Serializer):
    """Input contract for POST /api/orders/. Only IDs and quantities —
    the server re-prices everything via the discount engine."""
    address_id = serializers.IntegerField()
    apartment_id = serializers.IntegerField()
    slot_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    lines = serializers.ListField(child=serializers.DictField())


class UpdateOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
