"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?: "navbar" | "sidebar";
}

export default function LogoutButton({
  variant = "navbar",
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      if (!res.ok) {
        document.cookie =
          "better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie =
          "better-auth.session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
    } catch {
      document.cookie =
        "better-auth.session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie =
        "better-auth.session_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    window.location.href = "/";
  };

  const baseClasses =
    variant === "sidebar"
      ? "flex items-center justify-center gap-2 py-2 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors disabled:opacity-50 w-full"
      : "hidden md:flex items-center gap-2 px-4 py-2 text-sm theme-nav-link transition-colors rounded-lg hover:bg-surface-container/70 disabled:opacity-50";

  return (
    <button onClick={handleLogout} disabled={loading} className={baseClasses}>
      <LogOut className="w-4 h-4" />
      {loading ? "..." : "Logout"}
    </button>
  );
}
