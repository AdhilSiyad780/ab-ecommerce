import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useProducts, useCategories } from "../api/queries";
import ProductCard from "../components/ProductCard";
import { PageLoader, Spinner } from "../components/Spinner";

export default function Shop() {
  const [params] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState("All");
  const [sort, setSort] = useState("popular");
  const [onlyOffers, setOnlyOffers] = useState(false);

  const q = params.get("q") || "";
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.results ?? [];

  const query: Record<string, string> = {};
  if (activeCategory !== "All") query["category__name"] = activeCategory;
  if (q) query["search"] = q;
  if (onlyOffers) query["offers"] = "true";
  const orderingMap: Record<string, string> = { "price-asc": "sale_price", "price-desc": "-sale_price", newest: "-created_at" };
  if (orderingMap[sort]) query["ordering"] = orderingMap[sort];

  // Cached per unique filter combination — flipping between "All" and
  // "Vegetables" and back re-uses the cache instead of re-fetching.
  const { data, isLoading, isFetching } = useProducts(query);
  const products = data?.results ?? [];

  return (
    <main className="max-w-6xl mx-auto px-4 pb-10 pt-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["All", ...categories.map((c) => c.name)].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
              activeCategory === c ? "bg-green-700 text-white border-green-700" : "bg-surface border-line"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 my-3 items-center">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs border border-line rounded px-2 py-1.5 bg-bg">
          <option value="popular">Sort: Popularity</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
        <button
          onClick={() => setOnlyOffers((v) => !v)}
          className={`text-sm px-3 py-1.5 rounded-full border ${onlyOffers ? "bg-green-700 text-white border-green-700" : "bg-surface border-line"}`}
        >
          🏷 On Offer
        </button>
        <span className="ml-auto text-xs text-muted flex items-center gap-1.5">
          {isFetching && !isLoading && <Spinner className="text-green-700" size={12} />}
          {products.length} products
        </span>
      </div>

      {isLoading && products.length === 0 ? (
        <PageLoader label="Loading products…" />
      ) : products.length === 0 ? (
        <div className="text-center text-muted py-16">No products match your search.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  );
}