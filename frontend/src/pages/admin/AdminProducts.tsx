import { useState } from "react";
import { Product } from "../../api/client";
import { useProducts, useCategories, useAdminSaveProduct, useAdminDeleteProduct } from "../../api/queries";
import { useConfirm } from "../../context/ConfirmContext";
import { PageLoader, Spinner } from "../../components/Spinner";

const UNITS = ["250 g", "500 g", "kg", "2 kg", "5 kg", "piece", "dozen", "bunch"];
const EMOJI = ["🍅", "🧅", "🥔", "🥕", "🥦", "🫛", "🍆", "🌶️", "🥬", "🌿", "🍎", "🍌", "🍊", "🍇", "🥭", "🍉", "🍈", "🍍", "🍓", "🥝", "🫚", "🧄", "🥒", "🍠", "🥑", "🍐", "🍑"];

const emptyForm = {
  name: "", slug: "", category: 0, icon: "🥬", unit: "kg", price: 0, sale_price: 0,
  stock: 0, min_qty: 1, max_qty: 5, featured: false, tag: "",
};

function FeaturedToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" className={`w-9 h-5 rounded-full relative flex-shrink-0 transition ${on ? "bg-green-500" : "bg-line"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${on ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

export default function AdminProducts() {
  const { data: productsData, isLoading } = useProducts();
  const { data: categoriesData } = useCategories();
  const saveMutation = useAdminSaveProduct();
  const deleteMutation = useAdminDeleteProduct();
  const confirm = useConfirm();

  const products = productsData?.results ?? [];
  const categories = categoriesData?.results ?? [];

  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0]?.id ?? 0 });
    setShowForm(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug, category: p.category, icon: p.icon, unit: p.unit,
      price: p.price, sale_price: p.sale_price, stock: p.stock, min_qty: p.min_qty,
      max_qty: p.max_qty, featured: p.featured, tag: p.tag,
    });
    setShowForm(true);
  }

  async function save() {
    setSaving(true);
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await saveMutation.mutateAsync({ id: editing?.id, data: { ...form, slug } });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  function updateField(p: Product, field: "stock" | "sale_price", value: number) {
    saveMutation.mutate({ id: p.id, data: { [field]: value } });
  }
  function toggleFeatured(p: Product) {
    saveMutation.mutate({ id: p.id, data: { featured: !p.featured } });
  }
  async function remove(p: Product) {
    const ok = await confirm({
      title: "Delete this product?",
      message: `"${p.name}" will be permanently removed from the catalog. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) deleteMutation.mutate(p.id);
  }

  return (
    <div>
      <div className="flex justify-between items-center gap-2 mb-4">
        <h2 className="text-lg sm:text-xl font-display">All Products ({products.length})</h2>
        <button onClick={openAdd} className="bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-lg flex-shrink-0">+ Add Product</button>
      </div>

      <div className="bg-white border border-line rounded-xl p-3 sm:p-0">
        {isLoading && products.length === 0 ? (
          <PageLoader label="Loading products…" />
        ) : (
        <>
        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-3">
          {products.map((p) => (
            <div key={p.id} className="border border-line rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 text-lg">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{p.name} <span className="text-muted text-xs font-normal">/{p.unit}</span></div>
                  <div className="text-xs text-muted">{p.category_name} · MRP ₹{p.price}</div>
                </div>
                <FeaturedToggle on={p.featured} onClick={() => toggleFeatured(p)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Sale Price</label>
                  <input type="number" defaultValue={p.sale_price} onBlur={(e) => updateField(p, "sale_price", Number(e.target.value))}
                    className="w-full border border-line rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Stock</label>
                  <input type="number" defaultValue={p.stock} onBlur={(e) => updateField(p, "stock", Number(e.target.value))}
                    className="w-full border border-line rounded px-2 py-1.5 text-sm" />
                  {p.low_stock && <div className="text-red text-[10px] mt-0.5">Low stock</div>}
                </div>
              </div>
              <div className="flex gap-4 pt-1 border-t border-line">
                <button onClick={() => openEdit(p)} className="text-green-700 font-semibold text-xs pt-2">Edit</button>
                <button onClick={() => remove(p)} disabled={deleteMutation.isPending && deleteMutation.variables === p.id} className="text-red font-semibold text-xs pt-2 flex items-center gap-1.5 disabled:opacity-60">
                  {deleteMutation.isPending && deleteMutation.variables === p.id && <Spinner size={11} />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-muted uppercase border-b border-line">
                <th className="p-2.5">Product</th><th className="p-2.5">Category</th><th className="p-2.5">MRP</th>
                <th className="p-2.5">Sale Price</th><th className="p-2.5">Stock</th><th className="p-2.5">Featured</th><th className="p-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="p-2.5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">{p.icon}</span>
                    {p.name} <span className="text-muted text-xs">/{p.unit}</span>
                  </td>
                  <td className="p-2.5">{p.category_name}</td>
                  <td className="p-2.5">₹{p.price}</td>
                  <td className="p-2.5">
                    <input type="number" defaultValue={p.sale_price} onBlur={(e) => updateField(p, "sale_price", Number(e.target.value))}
                      className="w-16 border border-line rounded px-1.5 py-1 text-xs" />
                  </td>
                  <td className="p-2.5">
                    <input type="number" defaultValue={p.stock} onBlur={(e) => updateField(p, "stock", Number(e.target.value))}
                      className="w-16 border border-line rounded px-1.5 py-1 text-xs" />
                    {p.low_stock && <div className="text-red text-[10px]">Low stock</div>}
                  </td>
                  <td className="p-2.5"><FeaturedToggle on={p.featured} onClick={() => toggleFeatured(p)} /></td>
                  <td className="p-2.5 whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="text-green-700 font-semibold text-xs mr-3">Edit</button>
                    <button onClick={() => remove(p)} disabled={deleteMutation.isPending && deleteMutation.variables === p.id} className="text-red font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-60">
                      {deleteMutation.isPending && deleteMutation.variables === p.id && <Spinner size={11} />}
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-display">{editing ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-full bg-bg text-muted flex-shrink-0">✕</button>
            </div>

            <FormField label="Product Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-line rounded-lg px-3 py-2 text-sm" placeholder="e.g. Cucumber" />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: Number(e.target.value) })} className="w-full border border-line rounded-lg px-3 py-2 text-sm">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Unit">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-line rounded-lg px-3 py-2 text-sm">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label="Icon">
              <div className="flex flex-wrap gap-1.5">
                {EMOJI.map((ic) => (
                  <button key={ic} onClick={() => setForm({ ...form, icon: ic })} type="button"
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg border text-base ${form.icon === ic ? "border-green-700 bg-green-100" : "border-line bg-bg"}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="MRP (₹)">
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </FormField>
              <FormField label="Sale Price (₹)">
                <input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: Number(e.target.value) })} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Stock Quantity">
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </FormField>
              <FormField label="Max Order Qty">
                <input type="number" step={0.5} value={form.max_qty} onChange={(e) => setForm({ ...form, max_qty: Number(e.target.value) })} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
              </FormField>
            </div>

            <FormField label="Badge / Tag (optional)">
              <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="w-full border border-line rounded-lg px-3 py-2 text-sm" placeholder="e.g. Fresh Today, Best Seller" />
            </FormField>

            <div className="flex items-center justify-between py-2 mb-3">
              <label className="text-sm font-semibold">Featured Product</label>
              <FeaturedToggle on={form.featured} onClick={() => setForm({ ...form, featured: !form.featured })} />
            </div>

            <button onClick={save} disabled={saving} className="w-full bg-green-700 text-white py-3 sm:py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Spinner size={16} />}
              {editing ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-green-900 block mb-1">{label}</label>
      {children}
    </div>
  );
}