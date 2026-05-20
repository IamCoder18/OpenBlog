"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/components/ToastContext";

function ThemeBootstrap() {
  useEffect(() => {
    const stored = localStorage.getItem("openblog-theme");
    const serverTheme = document.documentElement.getAttribute("data-theme");
    if (serverTheme && stored !== serverTheme) {
      localStorage.setItem("openblog-theme", serverTheme);
    }
  }, []);

  return null;
}

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <ThemeBootstrap />
      {children}
    </ToastProvider>
  );
}
