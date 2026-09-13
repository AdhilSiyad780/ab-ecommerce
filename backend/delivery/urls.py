from rest_framework.routers import DefaultRouter
from .views import ApartmentViewSet, DeliverySlotViewSet

router = DefaultRouter()
router.register("apartments", ApartmentViewSet, basename="apartment")
router.register("slots", DeliverySlotViewSet, basename="slot")

urlpatterns = router.urls
