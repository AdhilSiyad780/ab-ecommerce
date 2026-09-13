import { useState } from "react";
import { useAdminOrders, useAdminAdvanceStatus, useAdminCancelOrder } from "../../api/queries";
import { Order } from "../../api/client";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { PageLoader, Spinner } from "../../components/Spinner";

const STATUS_SEQUENCE = ["PLACED", "CONFIRMED", "PREPARING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];
const STATUS_LABELS: Record<string, string> = {
  PLACED: "Order Placed", CONFIRMED: "Confirmed", PREPARING: "Preparing",
  PACKED: "Packed", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};

// True for a cancelled online order that's still marked PAID — meaning the
// automatic Razorpay refund either failed or was never attempted (e.g. a
// customer-initiated cancel where the refund attempt errored). This is the
// one persistent, always-visible signal that money needs manual attention —
// it doesn't rely on anyone having seen a toast at the right moment.
function needsManualRefund(o: Order) {
  return o.status === "CANCELLED" && o.payment_method === "ONLINE" && o.payment_status === "PAID";
}

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("");
  const { data, isLoading } = useAdminOrders(statusFilter ? { status: statusFilter } : {});
  const advanceMutation = useAdminAdvanceStatus();
  const cancelMutation = useAdminCancelOrder();
  const confirm = useConfirm();
  const showToast = useToast();
  const orders = data?.results ?? [];
  const refundAlerts = orders.filter(needsManualRefund);

  async function handleCancel(o: Order) {
    const ok = await confirm({
      title: "Cancel this order?",
      message: `Order ${o.order_number} will be cancelled and its items restocked. This can't be undone.`,
      confirmLabel: "Cancel Order",
      cancelLabel: "Keep Order",
      danger: true,
    });
    if (!ok) return;
    cancelMutation.mutate(o.id, {
      onSuccess: (result) => {
        if (result.refund_warning) {
          showToast(result.refund_warning, "warning");
        } else {
          showToast(`Order ${o.order_number} cancelled.`, "info");
        }
      },
      onError: (err: any) => showToast(err?.message || "Could not cancel this order.", "error"),
    });
  }

  function actions(o: Order) {
    if (o.status === "CANCELLED" || o.status === "DELIVERED") return null;
    const isAdvancing = advanceMutation.isPending && advanceMutation.variables === o.id;
    const isCancelling = cancelMutation.isPending && cancelMutation.variables === o.id;
    return (
      <>
        <button
          onClick={() => advanceMutation.mutate(o.id)}
          disabled={isAdvancing}
          className="text-green-700 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-60"
        >
          {isAdvancing && <Spinner size={12} />}
          Mark {STATUS_LABELS[STATUS_SEQUENCE[STATUS_SEQUENCE.indexOf(o.status) + 1]]}
        </button>
        <button
          onClick={() => handleCancel(o)}
          disabled={isCancelling}
          className="text-red font-semibold text-xs flex items-center gap-1.5 disabled:opacity-60"
        >
          {isCancelling && <Spinner size={12} />}
          Cancel
        </button>
      </>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-display mb-4">Orders</h2>

      {refundAlerts.length > 0 && (
        <div className="bg-red/10 border border-red text-red text-sm rounded-xl p-3 mb-4">
          <span className="font-semibold">⚠ {refundAlerts.length} order{refundAlerts.length > 1 ? "s" : ""} need{refundAlerts.length === 1 ? "s" : ""} a manual refund</span>
          <span className="ml-1">— cancelled online orders where the automatic Razorpay refund didn't go through. Check the Razorpay dashboard and refund these manually: {refundAlerts.map((o) => o.order_number).join(", ")}.</span>
        </div>
      )}

      <div className="bg-white border border-line rounded-xl p-3 sm:p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto border border-line rounded px-2 py-1.5 text-xs mb-3 bg-bg"
        >
          <option value="">All Statuses</option>
          {[...STATUS_SEQUENCE, "CANCELLED"].map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        {isLoading && orders.length === 0 ? (
          <PageLoader label="Loading orders…" />
        ) : orders.length === 0 ? (
          <div className="text-center text-muted py-8 text-sm">No orders yet.</div>
        ) : (
          <>
            {/* Mobile: stacked cards — a 7-column table doesn't fit a phone screen */}
            <div className="md:hidden space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="border border-line rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-semibold text-sm">{o.order_number}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">{STATUS_LABELS[o.status]}</span>
                      {needsManualRefund(o) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red text-white whitespace-nowrap">⚠ Refund needed</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted mb-0.5">{o.customer_name} · {o.apartment_name}</div>
                  <div className="text-xs text-muted mb-2">{o.payment_method === "COD" ? "COD" : "Online"} · {o.payment_status}</div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">₹{o.total}</span>
                    <div className="flex gap-3">{actions(o)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted uppercase border-b border-line">
                    <th className="p-2.5">Order ID</th><th className="p-2.5">Customer</th><th className="p-2.5">Apartment</th>
                    <th className="p-2.5">Amount</th><th className="p-2.5">Payment</th><th className="p-2.5">Status</th><th className="p-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-line last:border-0">
                      <td className="p-2.5 font-semibold">{o.order_number}</td>
                      <td className="p-2.5">{o.customer_name}</td>
                      <td className="p-2.5">{o.apartment_name}</td>
                      <td className="p-2.5">₹{o.total}</td>
                      <td className="p-2.5">{o.payment_method === "COD" ? "COD" : "Online"} · {o.payment_status}</td>
                      <td className="p-2.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{STATUS_LABELS[o.status]}</span>
                        {needsManualRefund(o) && (
                          <span className="block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red text-white w-fit">⚠ Refund needed</span>
                        )}
                      </td>
                      <td className="p-2.5 whitespace-nowrap space-x-3">{actions(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}