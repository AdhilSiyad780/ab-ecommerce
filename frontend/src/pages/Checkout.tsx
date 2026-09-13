import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, endpoints } from "../api/client";
import { useMyAddresses, useSlots, useCreateAddress, usePlaceOrder } from "../api/queries";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { Spinner } from "../components/Spinner";

declare global { interface Window { Razorpay: any } }

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { lines, apartment, pricing, couponCode, clear } = useCart();
  const navigate = useNavigate();
  const showToast = useToast();

  // Fetch the Razorpay widget script as soon as this page opens, not when
  // the customer clicks Pay. It's a ~150KB script from Razorpay's CDN —
  // fetching it inside the click handler was the main cause of the
  // multi-second delay before the payment widget appeared. By the time
  // they've filled in address + slot and clicked Place Order, this has
  // almost always already finished loading in the background.
  useEffect(() => { loadRazorpayScript(); }, []);

  const { data: addressesData } = useMyAddresses();
  const { data: slotsData } = useSlots();
  const createAddressMutation = useCreateAddress();
  const placeOrderMutation = usePlaceOrder();

  const addresses = addressesData?.results ?? [];
  const slots = slotsData?.results ?? [];

  const [addressId, setAddressId] = useState<number | null>(addresses[0]?.id ?? null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ customer_name: "", mobile: "", flat_number: "", floor: "", block: "", city: "Kochi", pin: "", landmark: "" });
  const [slotId, setSlotId] = useState<number | null>(slots[0]?.id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const effectiveAddressId = addressId ?? addresses[0]?.id ?? null;
  const effectiveSlotId = slotId ?? slots[0]?.id ?? null;

  async function saveAddress() {
    if (!apartment) return;
    const addr = await createAddressMutation.mutateAsync({ ...newAddr, apartment: apartment.id });
    setAddressId(addr.id);
    setShowNewAddress(false);
  }

  async function placeOrder() {
    if (!apartment || !effectiveAddressId || !effectiveSlotId) return;
    setPlacing(true);
    setError("");
    try {
      const order = await placeOrderMutation.mutateAsync({
        address_id: effectiveAddressId,
        apartment_id: apartment.id,
        slot_id: effectiveSlotId,
        payment_method: paymentMethod,
        coupon_code: couponCode || undefined,
        lines: lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
      });

      if (paymentMethod === "ONLINE") {
        const ok = await loadRazorpayScript(); // near-instant here — already preloaded on mount
        if (!ok) { setError("Could not load payment gateway. Please try again."); setPlacing(false); return; }
        const rp = await api<{ razorpay_order_id: string; amount: number; currency: string; key_id: string }>(
          "/orders/payments/razorpay/create/", { method: "POST", body: { order_id: order.id } }
        );

        // If the payment doesn't complete for any reason, the order sits
        // there with stock already deducted. Both failure paths below
        // release it via the normal cancel endpoint (safe here since a
        // freshly-placed order is always in the customer-cancellable
        // PLACED state) — otherwise a retry would double-deduct stock for
        // the same items, and an abandoned checkout would permanently
        // hold inventory hostage.
        async function releaseAbandonedOrder() {
          try { await endpoints.cancelOrder(order.id); } catch { /* best-effort */ }
        }

        const razorpay = new window.Razorpay({
          key: rp.key_id,
          amount: rp.amount,
          currency: rp.currency,
          order_id: rp.razorpay_order_id,
          name: "FreshCrate",
          description: `Order ${order.order_number}`,
          handler: async (response: any) => {
            // Confirm the payment ourselves immediately rather than waiting
            // on the webhook — the webhook still runs independently as a
            // backstop, but the customer shouldn't stare at a spinner for it.
            try {
              await api("/orders/payments/razorpay/verify/", {
                method: "POST",
                body: {
                  order_id: order.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
            } catch {
              // Verification failing here is rare and, if it happens, the
              // webhook will still confirm the payment moments later —
              // don't block the customer on it.
            }
            clear();
            navigate("/orders");
          },
          modal: {
            ondismiss: async () => {
              setPlacing(false);
              await releaseAbandonedOrder();
              showToast("Payment cancelled — no charge was made. You can try again.", "info");
            },
          },
        });

        razorpay.on("payment.failed", async () => {
          setPlacing(false);
          await releaseAbandonedOrder();
          setError("Payment failed. Please try again, or choose Cash on Delivery.");
        });

        razorpay.open();
        return;
      }

      clear();
      navigate("/orders");
    } catch (err: any) {
      setError(err.message || "Could not place order");
    } finally {
      if (paymentMethod === "COD") setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return <main className="max-w-lg mx-auto px-4 py-16 text-center text-muted">Your cart is empty.</main>;
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 pt-4">
      <h2 className="text-xl mb-4">Checkout</h2>

      <Panel title="Delivering To">
        {addresses.map((a) => (
          <label key={a.id} className={`block border rounded-lg p-3 mb-2 cursor-pointer ${effectiveAddressId === a.id ? "border-green-700 bg-green-100" : "border-line"}`}>
            <input type="radio" className="hidden" checked={effectiveAddressId === a.id} onChange={() => setAddressId(a.id)} />
            <div className="text-xs font-bold text-green-700 mb-1">{a.apartment_name}</div>
            <div className="text-sm font-semibold">{a.customer_name} · {a.mobile}</div>
            <div className="text-xs text-muted">Flat {a.flat_number}, {a.block && `Block ${a.block}, `}{a.apartment_name}, {a.city} – {a.pin}</div>
          </label>
        ))}
        {!showNewAddress ? (
          <button onClick={() => setShowNewAddress(true)} className="w-full border border-green-500 text-green-700 rounded-lg py-2 text-sm font-semibold">+ Add New Address</button>
        ) : (
          <div className="border border-line rounded-lg p-3 space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Name" className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.customer_name} onChange={(e) => setNewAddr({ ...newAddr, customer_name: e.target.value })} />
              <input placeholder="Mobile" className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.mobile} onChange={(e) => setNewAddr({ ...newAddr, mobile: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Block" className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.block} onChange={(e) => setNewAddr({ ...newAddr, block: e.target.value })} />
              <input placeholder="Floor" className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.floor} onChange={(e) => setNewAddr({ ...newAddr, floor: e.target.value })} />
              <input placeholder="Flat No." className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.flat_number} onChange={(e) => setNewAddr({ ...newAddr, flat_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="PIN Code" className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.pin} onChange={(e) => setNewAddr({ ...newAddr, pin: e.target.value })} />
              <input placeholder="Landmark (optional)" className="border border-line rounded px-2 py-1.5 text-sm" value={newAddr.landmark} onChange={(e) => setNewAddr({ ...newAddr, landmark: e.target.value })} />
            </div>
            <button onClick={saveAddress} disabled={createAddressMutation.isPending} className="w-full bg-green-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {createAddressMutation.isPending && <Spinner size={14} />}
              Save Address
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Delivery Slot">
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s) => (
            <button key={s.id} onClick={() => setSlotId(s.id)} className={`border rounded-lg p-2.5 text-left text-xs ${effectiveSlotId === s.id ? "border-green-700 bg-green-100 font-semibold" : "border-line"}`}>
              <div className="font-semibold">{s.label}</div>
              <div className="text-muted">{s.start_time} – {s.end_time}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Payment Method">
        {(["COD", "ONLINE"] as const).map((m) => (
          <label key={m} className={`flex items-center gap-3 border rounded-lg p-3 mb-2 cursor-pointer ${paymentMethod === m ? "border-green-700 bg-green-100" : "border-line"}`}>
            <input type="radio" className="hidden" checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
            <div className={`w-4 h-4 rounded-full border-2 border-green-500 flex-shrink-0 ${paymentMethod === m ? "bg-green-700" : ""}`} />
            <div>
              <div className="text-sm font-semibold">{m === "COD" ? "Cash on Delivery" : "Pay Online (UPI / Card / Net Banking)"}</div>
              <div className="text-xs text-muted">{m === "COD" ? "Pay when your order arrives" : "Secure payment via Razorpay"}</div>
            </div>
          </label>
        ))}
      </Panel>

      {pricing && (
        <Panel title="Order Summary">
          <div className="flex justify-between text-sm font-bold pt-1">
            <span>Grand Total</span><span>₹{pricing.grand_total}</span>
          </div>
        </Panel>
      )}

      {error && <div className="text-red text-sm mb-3">{error}</div>}

      <button
        disabled={placing || !effectiveAddressId || !effectiveSlotId}
        onClick={placeOrder}
        className="w-full bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
      >
        {placing && <Spinner size={16} />}
        {placing ? "Placing order…" : `Place Order${pricing ? ` · ₹${pricing.grand_total}` : ""}`}
      </button>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4 mb-4">
      <h3 className="text-sm font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}