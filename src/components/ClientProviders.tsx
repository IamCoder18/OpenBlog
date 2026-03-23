"use client";

import { ToastProvider } from "@/components/ToastContext";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
