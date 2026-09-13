import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { PageLoader, Spinner } from "../components/Spinner";

export default function Cart() {
  const { lines, addQty, setQty, pricing, pricingLoading, pricingError, couponCode, setCouponCode, apartment, clear } = useCart();
  const [couponInput, setCouponInput] = useState(couponCode);
  const navigate = useNavigate();

  useEffect(() => { setCouponInput(couponCode); }, [couponCode]);

  if (lines.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center text-muted">
        <div className="text-4xl mb-3">🧺</div>
        Your cart is empty.
        <div className="mt-4">
          <Link to="/shop" className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Start Shopping</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 pt-4">
      <h2 className="text-xl mb-4">Your Cart</h2>

      {!apartment && (
        <div className="bg-gold/20 border border-gold text-[#7a5316] text-sm rounded-xl p-3 mb-4">
          Select a delivery apartment on the Home page to see accurate pricing.
        </div>
      )}

      {pricingError && (
        <div className="bg-red/10 border border-red text-red text-sm rounded-xl p-3 mb-4">
          <div className="font-semibold mb-1">Couldn't load your cart</div>
          <div className="mb-2">{pricingError}</div>
          <div className="text-xs text-muted mb-2">
            This usually happens when an item in your saved cart no longer exists (for example, after the catalog was updated).
          </div>
          <button onClick={clear} className="text-xs font-semibold underline">Clear cart and start over</button>
        </div>
      )}

      {!pricingError && (
        pricingLoading && !pricing ? (
          <PageLoader label="Calculating your total…" />
        ) : (
        <>
          <div className="bg-surface border border-line rounded-xl divide-y divide-line mb-4">
            {pricing?.lines.map((l) => {
              const cartLine = lines.find((cl) => cl.productId === l.product_id);
              const step = l.unit === "kg" ? 0.5 : 1;
              return (
                <div key={l.product_id} className="flex gap-3 p-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{l.name}</div>
                    <div className="text-[11px] text-muted">{l.qty} {l.unit === "kg" ? "kg" : l.unit} · ₹{l.sale_price}/{l.unit}</div>
                    <button onClick={() => setQty(l.product_id, 0)} className="text-[11px] text-red font-semibold mt-1">Remove</button>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="font-bold text-sm">₹{l.line_total}</div>
                    <div className="flex items-center gap-2 bg-bg rounded px-1.5 py-0.5">
                      <button onClick={() => addQty(l.product_id, -step)} className="text-green-700 font-bold w-4">−</button>
                      <span className="text-xs">{cartLine?.qty ?? l.qty}</span>
                      <button onClick={() => addQty(l.product_id, step)} className="text-green-700 font-bold w-4">+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pricing && pricing.matched_combos.length > 0 && (
            <div className="bg-[#FFF7EA] border border-[#F0D9AE] rounded-lg p-3 mb-4 text-sm font-semibold text-gold-dark">
              🎉 Combo offer applied: {pricing.matched_combos.map((c) => c.name).join(", ")}
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Enter coupon code"
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => setCouponCode(couponInput)}
              className="border border-green-500 text-green-700 px-4 rounded-lg text-sm font-semibold"
            >
              Apply
            </button>
          </div>
          {pricing?.coupon_error && <div className="text-red text-xs mb-3">{pricing.coupon_error}</div>}
          {pricing?.coupon_code && !pricing.coupon_error && (
            <div className="text-green-700 text-xs mb-3">✓ Coupon "{pricing.coupon_code}" applied</div>
          )}

          {pricing && (
            <div className="bg-surface border border-line rounded-xl p-4 mb-4 text-sm relative">
              {pricingLoading && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] text-muted">
                  <Spinner className="text-green-700" size={12} /> Updating…
                </div>
              )}
              <Row label="Subtotal" value={pricing.subtotal_mrp} />
              {pricing.product_discount > 0 && <Row label="Product Discount" value={-pricing.product_discount} discount />}
              {pricing.combo_discount > 0 && <Row label="Combo Discount" value={-pricing.combo_discount} discount />}
              {pricing.coupon_discount > 0 && <Row label="Coupon Discount" value={-pricing.coupon_discount} discount />}
              <Row label="Delivery Charge" value={pricing.delivery_charge} free={pricing.delivery_charge === 0} />
              <div className="flex justify-between pt-2 mt-2 border-t border-dashed border-line font-bold text-base">
                <span>Total</span><span>₹{pricing.grand_total}</span>
              </div>
            </div>
          )}

          <button
            disabled={!pricing || pricingLoading || !apartment}
            onClick={() => navigate("/checkout")}
            className="w-full bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {pricingLoading && <Spinner size={16} />}
            Proceed to Checkout
          </button>
        </>
        )
      )}
    </main>
  );
}

function Row({ label, value, discount, free }: { label: string; value: number; discount?: boolean; free?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${discount ? "text-green-700" : "text-muted"}`}>
      <span>{label}</span>
      <span>{free ? "FREE" : `${value < 0 ? "− " : ""}₹${Math.abs(value)}`}</span>
    </div>
  );
}