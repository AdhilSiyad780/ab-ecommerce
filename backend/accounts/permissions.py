from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminRole(BasePermission):
    """Gate for every /admin-facing endpoint. A customer JWT is valid for
    login but will always be refused here — this is what makes the admin
    dashboard a genuinely separate, role-checked surface, not just a
    different frontend route."""

    message = "Admin access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin_role())


class IsSuperAdmin(BasePermission):
    message = "Super Admin access required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "SUPER_ADMIN")


class IsAdminOrReadOnly(BasePermission):
    """Public catalog browsing for everyone; writes restricted to admin roles.
    Used on Product/Category/Apartment/Coupon/Combo viewsets."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin_role())
