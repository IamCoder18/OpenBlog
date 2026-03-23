"use client";

import { useState } from "react";

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
      : "hidden md:flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-800/50 disabled:opacity-50";

  return (
    <button onClick={handleLogout} disabled={loading} className={baseClasses}>
      <span className="material-symbols-outlined text-sm">logout</span>
      {loading ? "..." : "Logout"}
    </button>
  );
}
