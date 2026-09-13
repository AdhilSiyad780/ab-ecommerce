from django.db import models
from catalog.models import Product


class DiscountType(models.TextChoices):
    FLAT = "FLAT", "Flat ₹"
    PERCENT = "PERCENT", "Percentage %"


class Coupon(models.Model):
    code = models.CharField(max_length=30, unique=True)
    type = models.CharField(max_length=10, choices=DiscountType.choices)
    amount = models.FloatField(help_text="Flat rupees or percent, depending on type")
    min_order_value = models.PositiveIntegerField(default=0)
    max_discount = models.PositiveIntegerField()
    start_date = models.DateTimeField()
    expiry_date = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(default=1000)
    per_user_limit = models.PositiveIntegerField(default=1)
    apartment_only = models.ForeignKey(
        "delivery.Apartment", null=True, blank=True, on_delete=models.SET_NULL,
        help_text="Leave blank to make this coupon valid for all apartments",
    )
    note = models.CharField(max_length=150, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.code


class Combo(models.Model):
    name = models.CharField(max_length=150)
    icon = models.CharField(max_length=10, blank=True, default="🧺")
    normal_price = models.PositiveIntegerField()
    combo_price = models.PositiveIntegerField()
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ComboItem(models.Model):
    combo = models.ForeignKey(Combo, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    qty = models.FloatField(default=1)

    def __str__(self):
        return f"{self.qty} x {self.product.name}"


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, related_name="usages", on_delete=models.CASCADE)
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    order = models.ForeignKey("orders.Order", on_delete=models.CASCADE)
    used_at = models.DateTimeField(auto_now_add=True)


class DiscountRuleConfig(models.Model):
    """Singleton row — the admin 'Discount Rules' panel toggles this."""
    product_stack_with_coupon = models.BooleanField(default=True)
    combo_stack_with_coupon = models.BooleanField(default=False)
    multiple_coupons = models.BooleanField(default=False)

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Discount stacking rules"
