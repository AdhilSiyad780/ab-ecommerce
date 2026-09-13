from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, mobile, name, password=None, **extra):
        if not mobile:
            raise ValueError("Mobile number is required")
        user = self.model(mobile=mobile, name=name, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile, name, password=None, **extra):
        extra.setdefault("role", User.Role.SUPER_ADMIN)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(mobile, name, password, **extra)


class User(AbstractUser):
    """Mobile-first auth: customers and staff both log in with mobile + password.
    Admin routes are gated separately in the frontend by checking `role`."""

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        ORDER_MANAGER = "ORDER_MANAGER", "Order Manager"
        INVENTORY_MANAGER = "INVENTORY_MANAGER", "Inventory Manager"
        DELIVERY_MANAGER = "DELIVERY_MANAGER", "Delivery Manager"

    username = None  # we don't use Django's default username field
    mobile = models.CharField(max_length=15, unique=True)
    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    status = models.CharField(max_length=10, default="active")  # active | inactive

    USERNAME_FIELD = "mobile"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    def is_admin_role(self):
        return self.role != User.Role.CUSTOMER

    def __str__(self):
        return f"{self.name} ({self.mobile})"


class Address(models.Model):
    user = models.ForeignKey(User, related_name="addresses", on_delete=models.CASCADE)
    customer_name = models.CharField(max_length=120)
    mobile = models.CharField(max_length=15)
    apartment = models.ForeignKey("delivery.Apartment", null=True, on_delete=models.SET_NULL)
    flat_number = models.CharField(max_length=30)
    floor = models.CharField(max_length=20, blank=True)
    block = models.CharField(max_length=20, blank=True)
    street = models.CharField(max_length=200, blank=True)
    landmark = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=80, default="Kochi")
    pin = models.CharField(max_length=10)
    instructions = models.CharField(max_length=250, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.flat_number}, {self.apartment}"
