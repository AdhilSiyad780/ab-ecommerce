from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from catalog.models import Category, Product
from delivery.models import Apartment, DeliverySlot
from discounts.models import Combo, ComboItem, Coupon


CATEGORIES = [
    ("Vegetables", "🥦"), ("Fruits", "🍎"), ("Leafy", "🥬"), ("Combos", "🧺"),
]

# (name, category, icon, unit, price, sale_price, stock, featured, tag)
PRODUCTS = [
    ("Tomato", "Vegetables", "🍅", "kg", 40, 32, 120, True, "20% OFF"),
    ("Onion", "Vegetables", "🧅", "kg", 35, 35, 200, False, ""),
    ("Potato", "Vegetables", "🥔", "kg", 30, 30, 8, False, ""),
    ("Carrot", "Vegetables", "🥕", "kg", 45, 38, 60, True, "Fresh Today"),
    ("Cauliflower", "Vegetables", "🥦", "piece", 28, 28, 40, False, ""),
    ("Lady's Finger", "Vegetables", "🫛", "kg", 38, 32, 0, False, ""),
    ("Brinjal", "Vegetables", "🍆", "kg", 34, 34, 55, False, ""),
    ("Green Chilli", "Vegetables", "🌶️", "250 g", 15, 15, 70, False, ""),
    ("Cucumber", "Vegetables", "🥒", "kg", 32, 28, 65, False, ""),
    ("Beetroot", "Vegetables", "🥕", "kg", 36, 36, 40, False, ""),
    ("Pumpkin", "Vegetables", "🎃", "kg", 28, 28, 35, False, ""),
    ("Drumstick", "Vegetables", "🥬", "250 g", 20, 20, 30, False, ""),
    ("Green Peas", "Vegetables", "🫛", "kg", 70, 60, 28, False, ""),
    ("Sweet Potato", "Vegetables", "🍠", "kg", 45, 45, 32, False, ""),
    ("Radish", "Vegetables", "🥕", "kg", 26, 26, 38, False, ""),
    ("Spring Onion", "Vegetables", "🌿", "bunch", 15, 15, 44, False, ""),
    ("Ginger", "Vegetables", "🫚", "250 g", 25, 22, 50, False, ""),
    ("Garlic", "Vegetables", "🧄", "250 g", 30, 30, 55, False, ""),
    ("Capsicum", "Vegetables", "🫑", "kg", 60, 50, 34, False, "17% OFF"),
    ("Spinach", "Leafy", "🥬", "bunch", 18, 18, 45, False, ""),
    ("Coriander", "Leafy", "🌿", "bunch", 10, 10, 90, False, ""),
    ("Mint Leaves", "Leafy", "🌿", "bunch", 8, 8, 60, False, ""),
    ("Fenugreek Leaves", "Leafy", "🥬", "bunch", 12, 12, 35, False, ""),
    ("Amaranth Leaves", "Leafy", "🥬", "bunch", 14, 14, 30, False, ""),
    ("Apple (Shimla)", "Fruits", "🍎", "kg", 180, 150, 75, True, "Best Seller"),
    ("Banana", "Fruits", "🍌", "dozen", 60, 60, 100, True, ""),
    ("Orange", "Fruits", "🍊", "kg", 90, 75, 50, False, "17% OFF"),
    ("Grapes", "Fruits", "🍇", "500 g", 55, 55, 40, False, ""),
    ("Mango (Alphonso)", "Fruits", "🥭", "kg", 220, 220, 25, True, "Limited Offer"),
    ("Watermelon", "Fruits", "🍉", "piece", 65, 65, 18, False, ""),
    ("Pomegranate", "Fruits", "🍎", "kg", 140, 120, 30, False, ""),
    ("Papaya", "Fruits", "🍈", "piece", 40, 40, 22, False, ""),
    ("Pineapple", "Fruits", "🍍", "piece", 55, 45, 20, False, ""),
    ("Guava", "Fruits", "🍈", "kg", 70, 60, 26, False, ""),
    ("Kiwi", "Fruits", "🥝", "piece", 25, 25, 48, False, ""),
    ("Sapota (Chikoo)", "Fruits", "🥭", "kg", 80, 70, 22, False, ""),
    ("Strawberry", "Fruits", "🍓", "250 g", 60, 50, 18, True, "Fresh Today"),
    ("Custard Apple", "Fruits", "🍏", "piece", 45, 45, 16, False, ""),
    ("Lemon", "Fruits", "🍋", "250 g", 18, 15, 70, False, ""),
    ("Coconut", "Fruits", "🥥", "piece", 35, 35, 40, False, ""),
]

APARTMENTS = [
    ("Green Valley Apartments", "Kakkanad", "682030", 20, 150, 500, True),
    ("Lake View Residency", "Edappally", "682024", 0, 300, 0, True),
    ("Palm Grove Towers", "Vyttila", "682019", 15, 200, 600, True),
    ("Riverside Homes", "Kaloor", "682017", 25, 200, 450, False),
]

SLOTS = [
    ("Morning", "7:00 AM", "9:00 AM", 30),
    ("Afternoon", "12:00 PM", "2:00 PM", 25),
    ("Evening", "5:00 PM", "7:00 PM", 30),
]


class Command(BaseCommand):
    help = "Seed FreshCrate with starter categories, products, apartments, slots, combos and coupons."

    def handle(self, *args, **options):
        cat_objs = {}
        for name, icon in CATEGORIES:
            cat, _ = Category.objects.get_or_create(name=name, defaults={"slug": slugify(name), "icon": icon})
            cat_objs[name] = cat
        self.stdout.write(self.style.SUCCESS(f"Categories: {len(cat_objs)}"))

        created = 0
        for name, cat, icon, unit, price, sale, stock, featured, tag in PRODUCTS:
            _, was_created = Product.objects.get_or_create(
                slug=slugify(name),
                defaults=dict(
                    name=name, category=cat_objs[cat], icon=icon, unit=unit,
                    price=price, sale_price=sale, stock=stock, featured=featured, tag=tag,
                    min_qty=0.5 if unit == "kg" else 1, max_qty=5,
                ),
            )
            created += was_created
        self.stdout.write(self.style.SUCCESS(f"Products created: {created} (total {Product.objects.count()})"))

        for name, area, pin, charge, min_order, free_above, enabled in APARTMENTS:
            Apartment.objects.get_or_create(
                name=name,
                defaults=dict(area=area, pin=pin, delivery_charge=charge, min_order_value=min_order,
                               free_above_value=free_above, enabled=enabled),
            )
        self.stdout.write(self.style.SUCCESS(f"Apartments: {Apartment.objects.count()}"))

        for label, start, end, max_orders in SLOTS:
            DeliverySlot.objects.get_or_create(label=label, defaults=dict(start_time=start, end_time=end, max_orders=max_orders))
        self.stdout.write(self.style.SUCCESS(f"Delivery slots: {DeliverySlot.objects.count()}"))

        # Combos
        veg_combo, _ = Combo.objects.get_or_create(
            name="Everyday Vegetable Combo",
            defaults=dict(icon="🧺", normal_price=220, combo_price=180),
        )
        if not veg_combo.items.exists():
            for pname, qty in [("Potato", 1), ("Onion", 1), ("Tomato", 0.5), ("Carrot", 0.5)]:
                ComboItem.objects.create(combo=veg_combo, product=Product.objects.get(slug=slugify(pname)), qty=qty)

        fruit_combo, _ = Combo.objects.get_or_create(
            name="Fruit Basket Mini",
            defaults=dict(icon="🧺", normal_price=190, combo_price=159),
        )
        if not fruit_combo.items.exists():
            for pname, qty in [("Apple (Shimla)", 0.5), ("Banana", 6), ("Orange", 0.5)]:
                ComboItem.objects.create(combo=fruit_combo, product=Product.objects.get(slug=slugify(pname)), qty=qty)

        self.stdout.write(self.style.SUCCESS(f"Combos: {Combo.objects.count()}"))

        # Coupons
        now = timezone.now()
        gv = Apartment.objects.filter(name="Green Valley Apartments").first()
        Coupon.objects.get_or_create(
            code="FIRST100",
            defaults=dict(type="FLAT", amount=100, min_order_value=500, max_discount=100,
                           start_date=now, expiry_date=now + timedelta(days=120),
                           usage_limit=500, per_user_limit=1, note="First order above ₹500"),
        )
        Coupon.objects.get_or_create(
            code="FRESH10",
            defaults=dict(type="PERCENT", amount=10, min_order_value=300, max_discount=80,
                           start_date=now, expiry_date=now + timedelta(days=60),
                           usage_limit=1000, per_user_limit=3, note="10% off, veggies & fruits"),
        )
        Coupon.objects.get_or_create(
            code="GV50",
            defaults=dict(type="FLAT", amount=50, min_order_value=400, max_discount=50,
                           start_date=now, expiry_date=now + timedelta(days=30),
                           usage_limit=200, per_user_limit=2, apartment_only=gv,
                           note="Green Valley Apartments special"),
        )
        self.stdout.write(self.style.SUCCESS(f"Coupons: {Coupon.objects.count()}"))
        self.stdout.write(self.style.SUCCESS("Seed complete."))
