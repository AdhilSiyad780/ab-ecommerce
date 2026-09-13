import { Link } from "react-router-dom";
import { useProducts, useApartments } from "../api/queries";
import ProductCard from "../components/ProductCard";
import { PageLoader } from "../components/Spinner";
import { useCart } from "../context/CartContext";

export default function Home() {
  const { data: featuredData, isLoading } = useProducts({ featured: "true" });
  const { data: apartmentsData } = useApartments();
  const { apartment, setApartment } = useCart();

  const featured = featuredData?.results ?? [];
  const apartments = apartmentsData?.results ?? [];

  return (
    <main className="max-w-6xl mx-auto px-4 pb-10">
      {!apartment && apartments.length > 0 && (
        <div className="mt-4 bg-gold/20 border border-gold text-[#7a5316] text-sm rounded-xl p-3">
          Pick a delivery apartment to see accurate pricing and delivery charges.
          <select
            className="ml-2 border border-line rounded px-2 py-1 text-sm bg-white"
            onChange={(e) => {
              const a = apartments.find((x) => x.id === Number(e.target.value));
              if (a) setApartment(a);
            }}
          >
            <option value="">Choose apartment…</option>
            {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-green-900 via-green-700 to-green-500 text-white p-7 relative overflow-hidden">
        <div className="text-xs text-green-100 font-semibold mb-2">FRESH PICKS, DAILY</div>
        <h2 className="text-2xl font-display font-semibold max-w-xs leading-tight">
          Farm-fresh produce, at your doorstep by evening.
        </h2>
        <p className="text-sm text-green-100 mt-2 mb-4 max-w-xs">
          Free delivery over ₹500 to select apartments.
        </p>
        <Link to="/shop" className="bg-gold text-[#2A1B04] font-bold px-4 py-2 rounded-lg text-sm inline-block">
          Shop Now
        </Link>
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xl">Today's Best Offers</h3>
          <Link to="/shop" className="text-sm text-green-700 font-semibold">View all</Link>
        </div>
        {isLoading && featured.length === 0 ? (
          <PageLoader label="Loading today's offers…" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </main>
  );
}