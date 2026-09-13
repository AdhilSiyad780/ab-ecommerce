from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PLACED = "PLACED", "Order Placed"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PREPARING = "PREPARING", "Preparing"
        PACKED = "PACKED", "Packed"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    class PaymentMethod(models.TextChoices):
        COD = "COD", "Cash on Delivery"
        ONLINE = "ONLINE", "Online Payment"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    order_number = models.CharField(max_length=30, unique=True)
    user = models.ForeignKey("accounts.User", related_name="orders", on_delete=models.PROTECT)
    address = models.ForeignKey("accounts.Address", on_delete=models.PROTECT)
    apartment = models.ForeignKey("delivery.Apartment", on_delete=models.PROTECT)
    slot = models.ForeignKey("delivery.DeliverySlot", on_delete=models.PROTECT)
    delivery_date = models.DateField()

    subtotal = models.PositiveIntegerField()
    product_discount = models.PositiveIntegerField(default=0)
    combo_discount = models.PositiveIntegerField(default=0)
    coupon_code = models.CharField(max_length=30, blank=True, null=True)
    coupon_discount = models.PositiveIntegerField(default=0)
    delivery_charge = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField()  # immutable snapshot — never recomputed from live prices

    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices)
    payment_status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLACED)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT)
    product_name = models.CharField(max_length=120)  # snapshot — survives future renames
    unit = models.CharField(max_length=10)
    qty = models.FloatField()
    unit_price = models.PositiveIntegerField()  # snapshot of sale price at order time
    line_total = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.qty} x {self.product_name}"


class Payment(models.Model):
    order = models.OneToOneField(Order, related_name="payment", on_delete=models.CASCADE)
    provider = models.CharField(max_length=30, default="razorpay")
    provider_order_id = models.CharField(max_length=80, blank=True, null=True)
    provider_payment_id = models.CharField(max_length=80, blank=True, null=True)
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Order.PaymentStatus.choices, default=Order.PaymentStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)


class Invoice(models.Model):
    order = models.OneToOneField(Order, related_name="invoice", on_delete=models.CASCADE)
    number = models.CharField(max_length=40, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
