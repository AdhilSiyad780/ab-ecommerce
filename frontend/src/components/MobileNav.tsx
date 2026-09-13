import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext";

const tabs = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/shop", label: "Shop", icon: "🔍" },
  { to: "/cart", label: "Cart", icon: "🧺" },
  { to: "/orders", label: "Orders", icon: "📦" },
  { to: "/account", label: "Account", icon: "👤" },
];

export default function MobileNav() {
  const { count } = useCart();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-line flex z-40 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold relative ${
              isActive ? "text-green-700" : "text-muted"
            }`
          }
        >
          <span className="text-lg leading-none relative">
            {t.icon}
            {t.to === "/cart" && count > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-gold-dark text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
