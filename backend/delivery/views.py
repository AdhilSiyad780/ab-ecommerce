from rest_framework import viewsets
from .models import Apartment, DeliverySlot
from .serializers import ApartmentSerializer, DeliverySlotSerializer
from accounts.permissions import IsAdminOrReadOnly


class ApartmentViewSet(viewsets.ModelViewSet):
    queryset = Apartment.objects.all().order_by("name")
    serializer_class = ApartmentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_authenticated and self.request.user.is_admin_role()):
            qs = qs.filter(enabled=True)
        return qs


class DeliverySlotViewSet(viewsets.ModelViewSet):
    queryset = DeliverySlot.objects.all()
    serializer_class = DeliverySlotSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.is_authenticated and self.request.user.is_admin_role()):
            qs = qs.filter(enabled=True)
        return qs
