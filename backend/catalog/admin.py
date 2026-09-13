from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "icon"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "unit", "price", "sale_price", "stock", "featured", "active"]
    list_filter = ["category", "featured", "active"]
    list_editable = ["stock", "sale_price", "active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
