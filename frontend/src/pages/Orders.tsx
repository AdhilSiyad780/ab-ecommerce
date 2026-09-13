import { Link } from "react-router-dom";
import { useMyOrders, useCancelOrder } from "../api/queries";
import { PageLoader, Spinner } from "../components/Spinner";
import { useToast } from "../context/ToastContext";

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Order Placed", CONFIRMED: "Confirmed", PREPARING: "Preparing",
  PACKED: "Packed", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  PLACED: "bg-blue-100 text-blue-700", CONFIRMED: "bg-green-100 text-green-700",
  PREPARING: "bg-yellow-100 text-yellow-800", PACKED: "bg-purple-100 text-purple-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700", DELIVERED: "bg-green-700 text-white",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function Orders() {
  const { data, isLoading } = useMyOrders();
  const cancelMutation = useCancelOrder();
  const showToast = useToast();
  const orders = data?.results ?? [];

  function handleCancel(orderId: number) {
    cancelMutation.mutate(orderId, {
      onSuccess: (order) => {
        // Give the customer an honest, specific answer about their money —
        // not the same generic message regardless of whether payment was
        // even involved.
        if (order.payment_method !== "ONLINE") {
          showToast("Order cancelled. No payment was collected, so there's nothing to refund.", "info");
        } else if (order.payment_status === "REFUNDED") {
          showToast("Order cancelled and refunded — expect the amount back in 2–7 business days.", "info");
        } else {
          // Payment was online but isn't marked REFUNDED yet — either the
          // automatic refund is still settling or it needs manual follow-up.
          // Either way, we don't tell the customer it's done when it isn't.
          showToast("Order cancelled. If a refund is due, our team will process it shortly.", "info");
        }
      },
      // This can legitimately happen: the order list is cached for a short
      // while, so if the shop has already started preparing your order
      // since this page last refreshed, the button may still show even
      // though the server will (correctly) refuse to cancel it now.
      onError: (err: any) => showToast(err?.message || "Could not cancel this order.", "error"),
    });
  }

  if (isLoading && orders.length === 0) {
    return <main className="max-w-lg mx-auto px-4"><PageLoader label="Loading your orders…" /></main>;
  }

  if (orders.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center text-muted">
        <div className="text-4xl mb-3">📦</div>
        You haven't placed any orders yet.
        <div className="mt-4">
          <Link to="/shop" className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Start Shopping</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 pt-4">
      <h2 className="text-xl mb-4">My Orders</h2>
      {orders.map((o) => {
        const isCancelling = cancelMutation.isPending && cancelMutation.variables === o.id;
        return (
          <div key={o.id} className="bg-surface border border-line rounded-xl p-4 mb-3">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-bold text-sm">{o.order_number}</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
            </div>
            <div className="text-xs text-muted mb-2">
              {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.items.length} item{o.items.length > 1 ? "s" : ""} · {o.payment_method === "COD" ? "COD" : "Online"}
            </div>
            <div className="flex justify-between items-center">
              <div className="font-bold">₹{o.total}</div>
              {["PLACED", "CONFIRMED"].includes(o.status) && (
                <button
                  onClick={() => handleCancel(o.id)}
                  disabled={isCancelling}
                  className="text-xs text-red font-semibold flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isCancelling && <Spinner size={12} />}
                  {isCancelling ? "Cancelling…" : "Cancel"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </main>
  );
}