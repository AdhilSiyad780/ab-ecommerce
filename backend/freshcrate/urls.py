from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import CustomTokenObtainPairView

urlpatterns = [
    path("admin/", admin.site.urls),  # Django's built-in admin — handy for quick data fixes

    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/accounts/", include("accounts.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/delivery/", include("delivery.urls")),
    path("api/discounts/", include("discounts.urls")),
    path("api/orders/", include("orders.urls")),
]
