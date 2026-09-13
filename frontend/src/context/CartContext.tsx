import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { endpoints, PriceCartResult, Apartment } from "../api/client";

interface CartLine { productId: number; qty: number }

interface CartContextType {
  lines: CartLine[];
  apartment: Apartment | null;
  setApartment: (a: Apartment) => void;
  setQty: (productId: number, qty: number) => void;
  addQty: (productId: number, delta: number) => void;
  clear: () => void;
  count: number;
  couponCode: string;
  setCouponCode: (c: string) => void;
  pricing: PriceCartResult | null;
  pricingLoading: boolean;
  pricingError: string | null;
  refreshPricing: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

const LS_KEY = "fc_cart_lines";
const LS_APT = "fc_cart_apartment";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  const [apartment, setApartmentState] = useState<Apartment | null>(() => {
    try { return JSON.parse(localStorage.getItem(LS_APT) || "null"); } catch { return null; }
  });
  const [couponCode, setCouponCode] = useState("");
  const [pricing, setPricing] = useState<PriceCartResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(lines)); }, [lines]);
  useEffect(() => { localStorage.setItem(LS_APT, JSON.stringify(apartment)); }, [apartment]);

  const setApartment = (a: Apartment) => setApartmentState(a);

  function setQty(productId: number, qty: number) {
    setLines((prev) => {
      const others = prev.filter((l) => l.productId !== productId);
      return qty <= 0 ? others : [...others, { productId, qty }];
    });
  }
  function addQty(productId: number, delta: number) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      const nextQty = Math.max(0, (existing?.qty ?? 0) + delta);
      const others = prev.filter((l) => l.productId !== productId);
      return nextQty <= 0 ? others : [...others, { productId, qty: nextQty }];
    });
  }
  function clear() {
    setLines([]);
    setCouponCode("");
    setPricing(null);
  }

  const refreshPricing = useCallback(async () => {
    if (lines.length === 0 || !apartment) { setPricing(null); setPricingError(null); return; }
    setPricingLoading(true);
    try {
      const result = await endpoints.priceCart(
        apartment.id,
        lines.map((l) => ({ product_id: l.productId, qty: l.qty })),
        couponCode || undefined
      );
      setPricing(result);
      setPricingError(null);
    } catch (e: any) {
      // Common cause: the cart (persisted in localStorage) still references
      // a product ID that no longer exists — e.g. the database was reseeded
      // since this cart was built. Surface it instead of silently showing
      // an empty cart with no explanation.
      setPricing(null);
      setPricingError(e?.message || "Could not calculate your cart total. Please try again.");
    } finally {
      setPricingLoading(false);
    }
  }, [lines, apartment, couponCode]);

  // Re-price live whenever the cart, apartment, or coupon changes —
  // mirrors how the prototype recalculated on every change, but now
  // the numbers come from the server, not client-side JS.
  useEffect(() => { refreshPricing(); }, [refreshPricing]);

  const count = lines.length;

  return (
    <CartContext.Provider value={{
      lines, apartment, setApartment, setQty, addQty, clear, count,
      couponCode, setCouponCode, pricing, pricingLoading, pricingError, refreshPricing,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}