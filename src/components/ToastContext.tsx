"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useRef,
} from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from "lucide-react";

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

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES: Record<ToastType, string> = {
  error: "bg-error-container/80 text-on-error-container",
  success: "theme-success-soft text-on-surface",
  warning: "theme-warning-soft text-on-surface",
  info: "bg-primary-container/80 text-on-primary-container",
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
        {toasts.map(toast => {
          const IconComponent = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-2xl backdrop-blur-xl shadow-ambient animate-slide-in-right ${STYLES[toast.type]}`}
            >
              <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-body leading-relaxed flex-1">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 opacity-60" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
