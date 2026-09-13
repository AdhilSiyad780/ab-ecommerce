from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    out_of_stock = serializers.BooleanField(read_only=True)
    low_stock = serializers.BooleanField(read_only=True)
    discount_percent = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "description", "category", "category_name",
            "icon", "image", "unit", "price", "sale_price", "stock", "low_stock_at",
            "min_qty", "max_qty", "featured", "active", "tag", "gst_percent",
            "out_of_stock", "low_stock", "discount_percent",
        ]

    def get_discount_percent(self, obj):
        if obj.price > obj.sale_price:
            return round((1 - obj.sale_price / obj.price) * 100)
        return 0
