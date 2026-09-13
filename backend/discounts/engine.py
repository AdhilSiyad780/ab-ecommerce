"""
FreshCrate discount engine.

This is the ONLY place cart totals are calculated. The React frontend sends
just product IDs and quantities — never prices — and this module looks up
real, current prices from the database and computes the total. That's what
stops a customer from tampering with amounts via browser dev tools.

Priority order (mirrors the admin "Discount Rules" panel):
  1. Item-level product discounts   (Product.price -> Product.sale_price)
  2. Combo / bundle discounts, if the cart satisfies a combo's items
  3. Coupon code, subject to the stacking rules below
  4. Delivery charge, based on the apartment + final discounted subtotal
"""

from dataclasses import dataclass, field
from django.utils import timezone

from catalog.models import Product
from delivery.models import Apartment
from .models import Combo, Coupon, CouponUsage, DiscountRuleConfig


class PricingError(Exception):
    """Raised for problems that should stop checkout (out of stock, invalid apartment...)."""


@dataclass
class PricedLine:
    product_id: int
    name: str
    unit: str
    qty: float
    mrp: int
    sale_price: int
    line_total: int


@dataclass
class PricingResult:
    lines: list
    subtotal_mrp: int
    subtotal: int
    product_discount: int
    matched_combos: list
    combo_discount: int
    coupon_code: str | None
    coupon_discount: int
    coupon_error: str | None
    delivery_charge: int
    grand_total: int
    apartment: Apartment = None


def price_cart(cart_lines, *, apartment_id, coupon_code=None, user=None):
    """
    cart_lines: list of {"product_id": int, "qty": float}
    Raises PricingError for hard failures (missing/inactive product, insufficient stock).
    Returns a PricingResult — coupon problems are reported via coupon_error,
    not raised, so the frontend can show "invalid coupon" without losing the cart.
    """
    product_ids = [l["product_id"] for l in cart_lines]
    products = {p.id: p for p in Product.objects.filter(id__in=product_ids)}

    lines = []
    for l in cart_lines:
        p = products.get(l["product_id"])
        if not p:
            raise PricingError(f"Product {l['product_id']} not found")
        if not p.active or p.stock < l["qty"]:
            raise PricingError(f"{p.name} is unavailable in the requested quantity")
        line_total = round(p.sale_price * l["qty"])
        lines.append(PricedLine(p.id, p.name, p.unit, l["qty"], p.price, p.sale_price, line_total))

    subtotal_mrp = sum(round(l.mrp * l.qty) for l in lines)
    subtotal = sum(l.line_total for l in lines)
    product_discount = subtotal_mrp - subtotal

    rules = DiscountRuleConfig.current()

    # --- combo matching ---------------------------------------------------
    matched_combos = []
    for combo in Combo.objects.filter(active=True).prefetch_related("items"):
        qty_by_product = {l.product_id: l.qty for l in lines}
        satisfied = all(qty_by_product.get(ci.product_id, 0) >= ci.qty for ci in combo.items.all())
        if satisfied:
            matched_combos.append({
                "id": combo.id, "name": combo.name,
                "discount": combo.normal_price - combo.combo_price,
            })
    combo_discount = sum(c["discount"] for c in matched_combos)

    # --- coupon -------------------------------------------------------------
    coupon_discount = 0
    coupon_error = None
    applied_code = None

    if coupon_code:
        coupon = Coupon.objects.filter(code__iexact=coupon_code.strip()).first()
        now = timezone.now()
        if not coupon:
            coupon_error = "Invalid coupon code"
        elif not coupon.active:
            coupon_error = "This coupon is no longer active"
        elif now < coupon.start_date or now > coupon.expiry_date:
            coupon_error = "This coupon has expired"
        elif subtotal < coupon.min_order_value:
            coupon_error = f"Minimum order ₹{coupon.min_order_value} required"
        elif coupon.apartment_only_id and coupon.apartment_only_id != apartment_id:
            coupon_error = "Not valid for your selected apartment"
        elif matched_combos and not rules.combo_stack_with_coupon:
            coupon_error = "This coupon cannot be combined with the active combo offer"
        else:
            total_uses = CouponUsage.objects.filter(coupon=coupon).count()
            if total_uses >= coupon.usage_limit:
                coupon_error = "This coupon has reached its usage limit"
            elif user is not None and user.is_authenticated:
                user_uses = CouponUsage.objects.filter(coupon=coupon, user=user).count()
                if user_uses >= coupon.per_user_limit:
                    coupon_error = "You've already used this coupon the maximum number of times"

            if not coupon_error:
                raw = coupon.amount if coupon.type == "FLAT" else round(subtotal * coupon.amount / 100)
                coupon_discount = min(raw, coupon.max_discount, subtotal)
                applied_code = coupon.code

    # --- delivery -------------------------------------------------------------
    apartment = Apartment.objects.filter(id=apartment_id).first()
    if not apartment:
        raise PricingError("Selected delivery area not found")

    after_discounts = max(0, subtotal - combo_discount - coupon_discount)
    delivery_charge = apartment.delivery_charge
    if apartment.free_above_value and after_discounts >= apartment.free_above_value:
        delivery_charge = 0

    grand_total = after_discounts + delivery_charge

    return PricingResult(
        lines=lines,
        subtotal_mrp=subtotal_mrp,
        subtotal=subtotal,
        product_discount=product_discount,
        matched_combos=matched_combos,
        combo_discount=combo_discount,
        coupon_code=applied_code,
        coupon_discount=coupon_discount,
        coupon_error=coupon_error,
        delivery_charge=delivery_charge,
        grand_total=grand_total,
        apartment=apartment,
    )
