from django.contrib import admin
from .models import Apartment, DeliverySlot


@admin.register(Apartment)
class ApartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "area", "delivery_charge", "min_order_value", "free_above_value", "enabled"]
    list_editable = ["delivery_charge", "min_order_value", "free_above_value", "enabled"]


@admin.register(DeliverySlot)
class DeliverySlotAdmin(admin.ModelAdmin):
    list_display = ["label", "start_time", "end_time", "max_orders", "enabled"]
    list_editable = ["max_orders", "enabled"]
