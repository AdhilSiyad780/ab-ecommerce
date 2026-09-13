import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "info" | "warning" | "error";
interface Toast { id: number; message: string; type: ToastType }

const ToastContext = createContext<((message: string, type?: ToastType) => void) | null>(null);

const STYLES: Record<ToastType, string> = {
  info: "bg-green-900 text-white",
  warning: "bg-gold text-[#2A1B04]",
  error: "bg-red text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    // Warnings (e.g. "refund failed, handle manually") stay longer — they matter more than a quick confirmation.
    const duration = type === "warning" ? 9000 : 4000;
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm px-0">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${STYLES[t.type]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}