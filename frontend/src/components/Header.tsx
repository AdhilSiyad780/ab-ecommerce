import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { count, apartment } = useCart();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-green-700 text-white flex items-center justify-center font-display font-bold">F</div>
          <div>
            <div className="font-display font-bold text-green-900 leading-tight">FreshCrate</div>
            <div className="text-[10px] text-muted hidden sm:block">FARM TO FLAT, DAILY</div>
          </div>
        </Link>

        <form onSubmit={onSearch} className="hidden sm:block flex-1 max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fruits, vegetables..."
            className="w-full px-4 py-2 rounded-full border border-line bg-bg text-sm"
          />
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden md:block text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full max-w-[180px] truncate">
            {apartment ? apartment.name : "Select delivery location"}
          </div>
          <Link to="/cart" className="relative w-9 h-9 rounded-full bg-bg border border-line flex items-center justify-center">
            🧺
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold-dark text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <Link to={user ? "/account" : "/login"} className="w-9 h-9 rounded-full bg-bg border border-line flex items-center justify-center">
            👤
          </Link>
        </div>
      </div>
      <form onSubmit={onSearch} className="sm:hidden px-4 pb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search fruits, vegetables..."
          className="w-full px-4 py-2 rounded-full border border-line bg-bg text-sm"
        />
      </form>
    </header>
  );
}
