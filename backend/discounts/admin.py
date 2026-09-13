from django.contrib import admin
from .models import Coupon, Combo, ComboItem, DiscountRuleConfig


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "type", "amount", "min_order_value", "max_discount", "expiry_date", "active"]
    list_editable = ["active"]


class ComboItemInline(admin.TabularInline):
    model = ComboItem
    extra = 1


@admin.register(Combo)
class ComboAdmin(admin.ModelAdmin):
    list_display = ["name", "normal_price", "combo_price", "active"]
    list_editable = ["active"]
    inlines = [ComboItemInline]


@admin.register(DiscountRuleConfig)
class DiscountRuleConfigAdmin(admin.ModelAdmin):
    list_display = ["product_stack_with_coupon", "combo_stack_with_coupon", "multiple_coupons"]

    def has_add_permission(self, request):
        # singleton row — created automatically on first access
        return not DiscountRuleConfig.objects.exists()
