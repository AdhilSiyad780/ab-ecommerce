import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 pt-4">
      <h2 className="text-xl mb-4">My Account</h2>
      <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-green-700 text-white flex items-center justify-center font-display text-lg">
          {user?.name?.charAt(0) ?? "U"}
        </div>
        <div>
          <div className="font-bold text-sm">{user?.name}</div>
          <div className="text-xs text-muted">{user?.mobile}</div>
        </div>
      </div>
      <button
        onClick={() => { logout(); navigate("/"); }}
        className="w-full border border-red text-red rounded-lg py-2.5 text-sm font-semibold"
      >
        Log Out
      </button>
    </main>
  );
}
