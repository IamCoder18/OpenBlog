"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
} from "react";

type ToastType = "error" | "success" | "warning" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  error: "error",
  success: "check_circle",
  warning: "warning",
  info: "info",
};

const STYLES: Record<ToastType, string> = {
  error: "bg-error-container/80 text-on-error-container",
  success: "bg-emerald-950/80 text-emerald-200",
  warning: "bg-amber-950/80 text-amber-200",
  info: "bg-primary-container/80 text-on-primary-container",
};

const ICON_COLORS: Record<ToastType, string> = {
  error: "text-error",
  success: "text-emerald-400",
  warning: "text-amber-400",
  info: "text-primary",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, type, message }]);
      const timer = setTimeout(() => removeToast(id), 5000);
      timers.current.set(id, timer);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl backdrop-blur-xl shadow-ambient animate-slide-in-right ${STYLES[toast.type]}`}
          >
            <span
              className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`}
            >
              {ICONS[toast.type]}
            </span>
            <p className="text-sm font-body leading-relaxed flex-1">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-lg opacity-60">
                close
              </span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
