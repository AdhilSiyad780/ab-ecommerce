import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface PendingConfirm extends ConfirmOptions {
  resolve: (result: boolean) => void;
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setPending({ ...opts, resolve }));
  }, []);

  function resolveWith(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[100]"
          onClick={(e) => e.target === e.currentTarget && resolveWith(false)}
        >
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-display text-lg text-green-900 mb-1.5">{pending.title}</h3>
            <p className="text-sm text-muted mb-5">{pending.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => resolveWith(false)}
                className="flex-1 border border-line rounded-lg py-2.5 text-sm font-semibold"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                onClick={() => resolveWith(true)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white ${pending.danger ? "bg-red" : "bg-green-700"}`}
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// Usage: const confirm = useConfirm(); const ok = await confirm({ title, message, danger: true });
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}