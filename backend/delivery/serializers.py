from rest_framework import serializers
from .models import Apartment, DeliverySlot


class ApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apartment
        fields = [
            "id", "name", "area", "pin", "delivery_charge",
            "min_order_value", "free_above_value", "enabled",
        ]


class DeliverySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliverySlot
        fields = ["id", "label", "start_time", "end_time", "max_orders", "enabled"]
