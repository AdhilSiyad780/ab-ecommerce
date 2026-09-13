import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await signup(name, mobile, password, email || undefined);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-14">
      <h2 className="text-xl mb-1">Create your account</h2>
      <p className="text-sm text-muted mb-6">Takes less than a minute.</p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Full Name" value={name} onChange={setName} />
        <Field label="Mobile Number" value={mobile} onChange={setMobile} placeholder="98765xxxxx" />
        <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        <Field label="Confirm Password" value={confirm} onChange={setConfirm} type="password" />
        {error && <div className="text-red text-xs">{error}</div>}
        <button disabled={loading} className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Spinner size={16} />}
          {loading ? "Creating account…" : "Sign Up"}
        </button>
      </form>
      <div className="text-center text-sm text-muted mt-4">
        Already have an account? <Link to="/login" className="text-green-700 font-semibold">Log in</Link>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-green-900 block mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-line rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}