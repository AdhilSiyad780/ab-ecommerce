from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import F
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from accounts.permissions import IsAdminOrReadOnly


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public: GET /api/catalog/products/?category=Vegetables&search=tomato&ordering=sale_price
    Admin (JWT with staff role required): POST/PATCH/DELETE to add products, edit stock, etc.
    """
    queryset = Product.objects.select_related("category").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "category__name": ["exact"],
        "featured": ["exact"],
        "active": ["exact"],
    }
    search_fields = ["name", "description"]
    ordering_fields = ["sale_price", "created_at", "name"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Anonymous customers only ever see active products; admins see everything
        # so they can re-enable a disabled product.
        if not (self.request.user.is_authenticated and self.request.user.is_admin_role()):
            qs = qs.filter(active=True)
        only_offers = self.request.query_params.get("offers")
        if only_offers == "true":
            qs = qs.filter(sale_price__lt=F("price"))
        return qs
