from rest_framework import generics, viewsets, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .models import Address
from .serializers import (
    CustomTokenObtainPairSerializer, SignupSerializer, UserSerializer, AddressSerializer,
)
from .permissions import IsAdminRole

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class SignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


class AdminCustomerViewSet(viewsets.ModelViewSet):
    """Admin → Customers list. Staff-only; supports activate/deactivate via PATCH."""
    queryset = User.objects.filter(role=User.Role.CUSTOMER).order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

    def partial_update(self, request, *args, **kwargs):
        # allow admin to toggle status only
        user = self.get_object()
        user.status = request.data.get("status", user.status)
        user.save()
        return self.retrieve(request, *args, **kwargs)
