import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: "📊", end: true },
  { to: "/admin/orders", label: "Orders", icon: "🧾" },
  { to: "/admin/products", label: "Products", icon: "🥕" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#F1F3ED]">
      {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 md:static z-50 h-full w-64 max-w-[80vw] bg-green-900 text-green-100 p-4 flex flex-col gap-1 transition-transform overflow-y-auto ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-2 pb-4 px-1">
          <div className="w-7 h-7 rounded-lg bg-green-700 text-white flex items-center justify-center font-display font-bold text-sm flex-shrink-0">F</div>
          <span className="text-white font-display font-bold text-sm">FreshCrate Admin</span>
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-2 px-2.5 py-2.5 rounded-lg text-sm ${isActive ? "bg-white/10 text-white" : ""}`}
          >
            {n.icon} {n.label}
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden">
        <div className="flex justify-between items-center gap-2 mb-5">
          <button className="md:hidden w-9 h-9 flex-shrink-0 rounded-lg bg-white border border-line text-base" onClick={() => setOpen(true)}>☰</button>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted min-w-0 ml-auto">
            <span className="hidden sm:inline truncate">Logged in as <strong className="text-green-900">{user?.name}</strong></span>
            <button onClick={() => { logout(); navigate("/admin/login"); }} className="border border-line px-3 py-1.5 rounded-lg font-semibold flex-shrink-0">Log Out</button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}