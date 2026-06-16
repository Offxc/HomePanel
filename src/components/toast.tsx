"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastItem = { id: number; message: string; leaving?: boolean };
type Ctx = { showToast: (msg: string) => void };

const ToastContext = createContext<Ctx>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    // Play the exit fade, then unmount once it finishes.
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 220);
    }, 1600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-pill ${t.leaving ? "toast-pill-out" : ""} bg-[var(--color-app-text)] text-[var(--color-app-surface)] px-4 py-2 rounded-full text-sm font-medium shadow-lg whitespace-nowrap`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
