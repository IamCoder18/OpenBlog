"use client";

import { useEffect } from "react";
import { ToastProvider } from "@/components/ToastContext";

function ThemeBootstrap() {
  useEffect(() => {
    const stored = localStorage.getItem("openblog-theme");
    const serverTheme = document.documentElement.getAttribute("data-theme");
    if (stored && stored !== serverTheme) {
      document.documentElement.setAttribute("data-theme", stored);
    } else if (serverTheme) {
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
