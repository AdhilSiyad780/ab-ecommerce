from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Address


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ["mobile", "name", "role", "status", "is_active"]
    list_filter = ["role", "status"]
    ordering = ["-date_joined"]
    fieldsets = (
        (None, {"fields": ("mobile", "password")}),
        ("Personal info", {"fields": ("name", "email")}),
        ("Role & status", {"fields": ("role", "status")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("mobile", "name", "password1", "password2", "role")}),
    )
    search_fields = ["mobile", "name", "email"]


admin.site.register(User, UserAdmin)
admin.site.register(Address)
