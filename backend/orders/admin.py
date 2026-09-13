from django.contrib import admin
from .models import Order, OrderItem, Payment, Invoice


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "product_name", "unit", "qty", "unit_price", "line_total"]
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "apartment", "total", "payment_method", "payment_status", "status", "created_at"]
    list_filter = ["status", "payment_method", "payment_status"]
    search_fields = ["order_number", "user__mobile", "user__name"]
    inlines = [OrderItemInline]
    readonly_fields = [f.name for f in Order._meta.fields if f.name not in ("status", "payment_status")]


admin.site.register(Payment)
admin.site.register(Invoice)
