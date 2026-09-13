from rest_framework import serializers
from .models import Coupon, Combo, ComboItem, DiscountRuleConfig


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id", "code", "type", "amount", "min_order_value", "max_discount",
            "start_date", "expiry_date", "usage_limit", "per_user_limit",
            "apartment_only", "note", "active",
        ]


class ComboItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    unit = serializers.CharField(source="product.unit", read_only=True)

    class Meta:
        model = ComboItem
        fields = ["id", "product", "product_name", "unit", "qty"]


class ComboSerializer(serializers.ModelSerializer):
    items = ComboItemSerializer(many=True)

    class Meta:
        model = Combo
        fields = ["id", "name", "icon", "normal_price", "combo_price", "active", "items"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        combo = Combo.objects.create(**validated_data)
        for item in items_data:
            ComboItem.objects.create(combo=combo, **item)
        return combo

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                ComboItem.objects.create(combo=instance, **item)
        return instance


class DiscountRuleConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountRuleConfig
        fields = ["product_stack_with_coupon", "combo_stack_with_coupon", "multiple_coupons"]


class PriceCartRequestSerializer(serializers.Serializer):
    apartment_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    lines = serializers.ListField(child=serializers.DictField())
