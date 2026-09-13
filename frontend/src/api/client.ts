const BASE = import.meta.env.VITE_API_URL || "/api"; // dev: proxied to Django by vite.config.ts. prod: set VITE_API_URL to your deployed API's URL.

function getTokens() {
  return {
    access: localStorage.getItem("fc_access"),
    refresh: localStorage.getItem("fc_refresh"),
  };
}
export function setTokens(access: string, refresh: string) {
  localStorage.setItem("fc_access", access);
  localStorage.setItem("fc_refresh", refresh);
}
export function clearTokens() {
  localStorage.removeItem("fc_access");
  localStorage.removeItem("fc_refresh");
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  const res = await fetch(`${BASE}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  localStorage.setItem("fc_access", data.access);
  return data.access;
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach Authorization header (default true if a token exists)
}

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const { access } = getTokens();
  if (auth && access) headers["Authorization"] = `Bearer ${access}`;

  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Access token expired mid-session — refresh once and retry, transparently.
  if (res.status === 401 && auth) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: { ...headers, Authorization: `Bearer ${newAccess}` },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.error || data.detail)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// In-memory GET cache
//
// Without this, every time React Router unmounts a page (e.g. leaving Home
// for Cart) and remounts it (going back), the page's useEffect re-fetches
// from scratch — that's the 2-second reload. A module-level Map survives
// component unmount/remount (it's outside React entirely), so a second
// visit within the TTL window returns instantly with zero network calls.
//
// TTL is short (60s for catalog data) so stock/price edits from the admin
// still show up reasonably quickly on their own — and admin writes below
// call invalidateCache() explicitly so an admin's own edits are never stale.
// ---------------------------------------------------------------------------
const cacheStore = new Map<string, { data: unknown; expires: number }>();

async function cachedApi<T>(path: string, ttlMs: number): Promise<T> {
  const hit = cacheStore.get(path);
  if (hit && hit.expires > Date.now()) {
    return hit.data as T;
  }
  const data = await api<T>(path, { auth: false });
  cacheStore.set(path, { data, expires: Date.now() + ttlMs });
  return data;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) { cacheStore.clear(); return; }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) cacheStore.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Typed shapes matching the DRF serializers
// ---------------------------------------------------------------------------
export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: number;
  category_name: string;
  icon: string;
  image: string | null;
  unit: string;
  price: number;
  sale_price: number;
  stock: number;
  min_qty: number;
  max_qty: number;
  featured: boolean;
  active: boolean;
  tag: string;
  out_of_stock: boolean;
  low_stock: boolean;
  discount_percent: number;
}
export interface Category { id: number; name: string; slug: string; icon: string }
export interface Apartment {
  id: number; name: string; area: string; pin: string;
  delivery_charge: number; min_order_value: number; free_above_value: number; enabled: boolean;
}
export interface DeliverySlot { id: number; label: string; start_time: string; end_time: string; enabled: boolean }
export interface Address {
  id: number; customer_name: string; mobile: string; apartment: number | null; apartment_name: string;
  flat_number: string; floor: string; block: string; street: string; landmark: string; city: string; pin: string; instructions: string;
}
export interface PricedLine { product_id: number; name: string; unit: string; qty: number; mrp: number; sale_price: number; line_total: number }
export interface PriceCartResult {
  lines: PricedLine[]; subtotal_mrp: number; subtotal: number; product_discount: number;
  matched_combos: { id: number; name: string; discount: number }[]; combo_discount: number;
  coupon_code: string | null; coupon_discount: number; coupon_error: string | null;
  delivery_charge: number; grand_total: number;
}
export interface OrderItem { id: number; product: number; product_name: string; unit: string; qty: number; unit_price: number; line_total: number }
export interface Order {
  id: number; order_number: string; customer_name: string; customer_mobile: string;
  address: number; apartment: number; apartment_name: string; slot: number; slot_label: string;
  subtotal: number; product_discount: number; combo_discount: number; coupon_code: string | null; coupon_discount: number;
  delivery_charge: number; total: number; payment_method: "COD" | "ONLINE"; payment_status: string; status: string;
  created_at: string; items: OrderItem[];
  refund_warning?: string; // present on the admin cancel response when an automatic refund failed
}
interface Paginated<T> { count: number; results: T[] }

// ---------------------------------------------------------------------------
// Endpoint helpers
// ---------------------------------------------------------------------------
export const endpoints = {
  login: (mobile: string, password: string) =>
    api<{ access: string; refresh: string }>("/auth/login/", { method: "POST", body: { mobile, password }, auth: false }),
  signup: (name: string, mobile: string, password: string, email?: string) =>
    api("/accounts/signup/", { method: "POST", body: { name, mobile, password, email }, auth: false }),
  me: () => api("/accounts/me/"),

  products: (params: Record<string, string> = {}) =>
    cachedApi<Paginated<Product>>(`/catalog/products/?${new URLSearchParams(params)}`, 60_000),
  categories: () => cachedApi<Paginated<Category>>("/catalog/categories/", 5 * 60_000),

  apartments: () => cachedApi<Paginated<Apartment>>("/delivery/apartments/", 5 * 60_000),
  slots: () => cachedApi<Paginated<DeliverySlot>>("/delivery/slots/", 5 * 60_000),

  myAddresses: () => api<Paginated<Address>>("/accounts/addresses/"),
  createAddress: (data: Partial<Address>) => api<Address>("/accounts/addresses/", { method: "POST", body: data }),

  priceCart: (apartment_id: number, lines: { product_id: number; qty: number }[], coupon_code?: string) =>
    api<PriceCartResult>("/discounts/price-cart/", { method: "POST", body: { apartment_id, lines, coupon_code }, auth: false }),

  placeOrder: (payload: {
    address_id: number; apartment_id: number; slot_id: number;
    payment_method: "COD" | "ONLINE"; coupon_code?: string; lines: { product_id: number; qty: number }[];
  }) => api<Order>("/orders/", { method: "POST", body: payload }),
  myOrders: () => api<Paginated<Order>>("/orders/"),
  cancelOrder: (id: number) => api<Order>(`/orders/${id}/cancel/`, { method: "POST" }),

  // --- admin ---
  adminOrders: (params: Record<string, string> = {}) =>
    api<Paginated<Order>>(`/orders/admin/orders/?${new URLSearchParams(params)}`),
  adminAdvanceStatus: (id: number) => api<Order>(`/orders/admin/orders/${id}/advance_status/`, { method: "POST" }),
  adminCancelOrder: (id: number) => api<Order>(`/orders/admin/orders/${id}/cancel/`, { method: "POST" }),
  adminCreateProduct: (data: Partial<Product>) =>
    api<Product>("/catalog/products/", { method: "POST", body: data }).then((r) => { invalidateCache("/catalog/products"); return r; }),
  adminUpdateProduct: (id: number, data: Partial<Product>) =>
    api<Product>(`/catalog/products/${id}/`, { method: "PATCH", body: data }).then((r) => { invalidateCache("/catalog/products"); return r; }),
  adminDeleteProduct: (id: number) =>
    api(`/catalog/products/${id}/`, { method: "DELETE" }).then((r) => { invalidateCache("/catalog/products"); return r; }),
};