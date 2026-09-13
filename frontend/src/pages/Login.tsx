import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";

export default function Login() {
  const { login } = useAuth();
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
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-14">
      <h2 className="text-xl mb-1">Welcome back</h2>
      <p className="text-sm text-muted mb-6">Log in to track orders and use saved addresses.</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-green-900 block mb-1">Mobile Number</label>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full border border-line rounded-lg px-3 py-2 text-sm" placeholder="98765xxxxx" />
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
      <div className="text-center text-sm text-muted mt-4">
        New here? <Link to="/signup" className="text-green-700 font-semibold">Create an account</Link>
      </div>
    </main>
  );
}