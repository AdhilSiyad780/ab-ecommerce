from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Address

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/name to the JWT payload so the frontend can branch
    customer vs. admin UI without an extra API call."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["name"] = user.name
        token["mobile"] = user.mobile
        token["role"] = user.role
        return token


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["id", "name", "mobile", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "mobile", "email", "role", "status", "date_joined"]
        read_only_fields = ["role", "status"]


class AddressSerializer(serializers.ModelSerializer):
    apartment_name = serializers.CharField(source="apartment.name", read_only=True)

    class Meta:
        model = Address
        fields = [
            "id", "customer_name", "mobile", "apartment", "apartment_name",
            "flat_number", "floor", "block", "street", "landmark", "city", "pin", "instructions",
        ]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
