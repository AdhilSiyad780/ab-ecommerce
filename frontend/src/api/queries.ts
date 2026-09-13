import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { endpoints, Product } from "./client";

// ---------------------------------------------------------------------------
// Query keys — centralized so invalidation after a mutation always matches
// the key a page used to fetch, instead of guessing string literals per file.
// ---------------------------------------------------------------------------
export const qk = {
  products: (params: Record<string, string> = {}) => ["products", params] as const,
  categories: () => ["categories"] as const,
  apartments: () => ["apartments"] as const,
  slots: () => ["slots"] as const,
  myOrders: () => ["myOrders"] as const,
  myAddresses: () => ["myAddresses"] as const,
  adminOrders: (params: Record<string, string> = {}) => ["adminOrders", params] as const,
};

// ---------------------------------------------------------------------------
// Customer-facing reads — cached per staleTime set in main.tsx (5 min).
// Navigating away and back within that window is instant: no spinner,
// no network call, data comes straight from the cache.
// ---------------------------------------------------------------------------
export function useProducts(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: qk.products(params),
    queryFn: () => endpoints.products(params),
  });
}

export function useCategories() {
  return useQuery({ queryKey: qk.categories(), queryFn: endpoints.categories, staleTime: 30 * 60 * 1000 });
}

export function useApartments() {
  return useQuery({ queryKey: qk.apartments(), queryFn: endpoints.apartments, staleTime: 30 * 60 * 1000 });
}

export function useSlots() {
  return useQuery({ queryKey: qk.slots(), queryFn: endpoints.slots, staleTime: 30 * 60 * 1000 });
}

export function useMyOrders() {
  return useQuery({ queryKey: qk.myOrders(), queryFn: endpoints.myOrders, staleTime: 30 * 1000 }); // shorter — status changes often
}

export function useMyAddresses() {
  return useQuery({ queryKey: qk.myAddresses(), queryFn: endpoints.myAddresses });
}

export function useAdminOrders(params: Record<string, string> = {}) {
  return useQuery({ queryKey: qk.adminOrders(params), queryFn: () => endpoints.adminOrders(params), staleTime: 15 * 1000 });
}

// ---------------------------------------------------------------------------
// Mutations — every write invalidates exactly the cached reads it affects,
// so e.g. editing stock in the admin panel immediately shows correct stock
// on the customer Shop page too (next time its cache is read/refetched),
// without needing a hard page reload.
// ---------------------------------------------------------------------------
export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => endpoints.cancelOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myOrders"] }),
  });
}

export function useAdminAdvanceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => endpoints.adminAdvanceStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });
}

export function useAdminCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => endpoints.adminCancelOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminOrders"] }),
  });
}

export function useAdminSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id?: number; data: Partial<Product> }) =>
      args.id ? endpoints.adminUpdateProduct(args.id, args.data) : endpoints.adminCreateProduct(args.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAdminDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => endpoints.adminDeleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: endpoints.placeOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myOrders"] }),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: endpoints.createAddress,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myAddresses"] }),
  });
}
