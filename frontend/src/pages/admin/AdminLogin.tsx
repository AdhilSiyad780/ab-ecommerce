import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/Spinner";

export default function AdminLogin() {
  const { login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(mobile, password);
      // login() sets user from the JWT's role claim; re-check here since
      // state updates are async — a CUSTOMER JWT is valid but not admin.
      const access = localStorage.getItem("fc_access")!;
      const role = JSON.parse(atob(access.split(".")[1])).role;
      if (role === "CUSTOMER") {
        setError("This account doesn't have admin access.");
        setLoading(false);
        return;
      }
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-green-900 flex items-center justify-center p-5">
      <div className="bg-white rounded-2xl p-7 w-full max-w-sm">
        <div className="w-11 h-11 rounded-xl bg-green-700 text-white flex items-center justify-center font-display font-bold text-xl mb-4">F</div>
        <h2 className="text-lg font-display font-semibold mb-1">Admin Sign In</h2>
        <p className="text-xs text-muted mb-5">This is a separate login from the customer website.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-green-900 block mb-1">Mobile Number</label>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-green-900 block mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <div className="text-red text-xs">{error}</div>}
          <button disabled={loading} className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Spinner size={16} />}
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>
        <div className="text-[11px] text-muted bg-bg rounded-lg p-2.5 mt-4">
          Create an admin user via <code>python manage.py createsuperuser</code>, or set a user's <code>role</code> field in Django admin.
        </div>
      </div>
    </div>
  );
}