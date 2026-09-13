import { useAdminOrders, useProducts } from "../../api/queries";
import { PageLoader } from "../../components/Spinner";

export default function AdminDashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useAdminOrders();
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const orders = ordersData?.results ?? [];
  const products = productsData?.results ?? [];

  if (ordersLoading && productsLoading && orders.length === 0 && products.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-display mb-4">Dashboard</h2>
        <PageLoader label="Loading dashboard…" />
      </div>
    );
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "PLACED").length;
  const lowStock = products.filter((p) => p.low_stock);
  const outOfStock = products.filter((p) => p.out_of_stock);

  return (
    <div>
      <h2 className="text-xl font-display mb-4">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="Total Orders" value={orders.length} sub={`${pending} pending confirmation`} />
        <Stat label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} sub={`Across ${orders.length} orders`} />
        <Stat label="Products" value={products.length} sub={`${products.filter((p) => p.featured).length} featured`} />
        <Stat label="Stock Alerts" value={lowStock.length + outOfStock.length} sub={`${outOfStock.length} out of stock`} danger />
      </div>

      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3">Needs Attention</h3>
        {lowStock.length + outOfStock.length === 0 ? (
          <div className="text-sm text-muted">All stock levels healthy.</div>
        ) : (
          [...outOfStock, ...lowStock].map((p) => (
            <div key={p.id} className="flex justify-between py-2 border-b border-line last:border-0 text-sm">
              <span>{p.icon} {p.name}</span>
              <span className={p.out_of_stock ? "text-red font-bold" : "text-gold-dark font-semibold"}>
                {p.out_of_stock ? "Out of stock" : `${p.stock} ${p.unit} left`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, danger }: { label: string; value: string | number; sub: string; danger?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`font-display text-2xl font-semibold ${danger && Number(value) > 0 ? "text-red" : "text-green-900"}`}>{value}</div>
      <div className="text-[11px] text-green-700 font-semibold mt-1">{sub}</div>
    </div>
  );
}