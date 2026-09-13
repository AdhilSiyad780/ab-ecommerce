from django.db import models


class Apartment(models.Model):
    name = models.CharField(max_length=150)
    area = models.CharField(max_length=100)
    pin = models.CharField(max_length=10)
    delivery_charge = models.PositiveIntegerField(default=0)
    min_order_value = models.PositiveIntegerField(default=0)
    free_above_value = models.PositiveIntegerField(default=0, help_text="0 disables free-delivery threshold")
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.area})"


class DeliverySlot(models.Model):
    label = models.CharField(max_length=40)   # Morning / Afternoon / Evening
    start_time = models.CharField(max_length=20)
    end_time = models.CharField(max_length=20)
    max_orders = models.PositiveIntegerField(default=30)
    enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.label} ({self.start_time}–{self.end_time})"
