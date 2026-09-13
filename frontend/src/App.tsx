import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ToastProvider } from "./context/ToastContext";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}

function CustomerShell({ children }: { children: JSX.Element }) {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />
      {children}
      <MobileNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ConfirmProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Customer site */}
            <Route path="/" element={<CustomerShell><Home /></CustomerShell>} />
            <Route path="/shop" element={<CustomerShell><Shop /></CustomerShell>} />
            <Route path="/cart" element={<CustomerShell><Cart /></CustomerShell>} />
            <Route path="/login" element={<CustomerShell><Login /></CustomerShell>} />
            <Route path="/signup" element={<CustomerShell><Signup /></CustomerShell>} />
            <Route path="/checkout" element={<CustomerShell><RequireAuth><Checkout /></RequireAuth></CustomerShell>} />
            <Route path="/orders" element={<CustomerShell><RequireAuth><Orders /></RequireAuth></CustomerShell>} />
            <Route path="/account" element={<CustomerShell><RequireAuth><Profile /></RequireAuth></CustomerShell>} />

            {/* Admin — entirely separate login + layout, never shares the customer session */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ToastProvider>
        </ConfirmProvider>
      </CartProvider>
    </AuthProvider>
  );
}