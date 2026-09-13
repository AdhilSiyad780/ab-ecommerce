from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SignupView, MeView, AddressViewSet, AdminCustomerViewSet

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")
router.register("admin/customers", AdminCustomerViewSet, basename="admin-customer")

urlpatterns = [
    path("signup/", SignupView.as_view(), name="signup"),
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]
