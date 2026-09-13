from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True)  # emoji, matches the prototype

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    class Unit(models.TextChoices):
        G_250 = "250 g", "250 g"
        G_500 = "500 g", "500 g"
        KG = "kg", "kg"
        KG_2 = "2 kg", "2 kg"
        KG_5 = "5 kg", "5 kg"
        PIECE = "piece", "piece"
        DOZEN = "dozen", "dozen"
        BUNCH = "bunch", "bunch"

    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, related_name="products", on_delete=models.PROTECT)
    icon = models.CharField(max_length=10, blank=True)      # emoji placeholder until real photos are uploaded
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.KG)
    price = models.PositiveIntegerField(help_text="MRP in ₹")
    sale_price = models.PositiveIntegerField(help_text="Selling price in ₹")
    stock = models.FloatField(default=0)
    low_stock_at = models.FloatField(default=10)
    min_qty = models.FloatField(default=1)
    max_qty = models.FloatField(default=5)
    featured = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    tag = models.CharField(max_length=40, blank=True)  # "Fresh Today", "Best Seller"...
    gst_percent = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-featured", "name"]

    @property
    def out_of_stock(self):
        return self.stock <= 0

    @property
    def low_stock(self):
        return 0 < self.stock <= self.low_stock_at

    def __str__(self):
        return f"{self.name} (₹{self.sale_price}/{self.unit})"
