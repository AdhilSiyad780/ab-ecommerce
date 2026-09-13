import { Product } from "../api/client";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { lines, addQty, setQty } = useCart();
  const inCart = lines.find((l) => l.productId === product.id)?.qty ?? 0;
  const step = product.unit === "kg" ? 0.5 : 1;

  return (
    <div className="bg-surface border border-line rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="h-28 rounded-2xl bg-green-100 m-2 flex items-center justify-center text-4xl relative">
        {product.discount_percent > 0 && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-gold text-[#2A1B04] px-2 py-0.5 rounded">
            {product.discount_percent}% OFF
          </span>
        )}
        {product.out_of_stock && (
          <span className="absolute top-2 right-2 text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
            Out of Stock
          </span>
        )}
        {product.icon || "🥬"}
      </div>
      <div className="px-3 pb-3 flex-1 flex flex-col">
        <div className="font-semibold text-sm">{product.name}</div>
        <div className="text-[11px] text-muted mb-1.5">₹{product.sale_price}/{product.unit}</div>
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="font-bold text-green-900">₹{product.sale_price}</span>
          {product.discount_percent > 0 && (
            <span className="text-xs text-muted line-through">₹{product.price}</span>
          )}
        </div>
        {product.out_of_stock ? (
          <div className="mt-auto text-center bg-gray-100 text-gray-400 py-2 rounded-lg text-xs font-semibold">
            Notify me
          </div>
        ) : inCart > 0 ? (
          <div className="mt-auto flex items-center justify-between bg-green-700 rounded-lg px-2 py-1.5">
            <button onClick={() => addQty(product.id, -step)} className="text-white w-5 text-lg">−</button>
            <span className="text-white text-xs font-semibold">{inCart}{product.unit === "kg" ? " kg" : ""}</span>
            <button onClick={() => addQty(product.id, step)} className="text-white w-5 text-lg">+</button>
          </div>
        ) : (
          <button
            onClick={() => setQty(product.id, product.min_qty)}
            className="mt-auto bg-green-700 text-white py-2 rounded-lg text-xs font-semibold"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
