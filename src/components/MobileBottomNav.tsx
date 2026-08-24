"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Compass,
  User,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

interface MobileBottomNavProps {
  activeTab?: "feed" | "explore" | "dashboard";
  canAccessDashboard?: boolean;
  userRole?: string;
  isAdmin?: boolean;
}

export default function MobileBottomNav({
  activeTab,
  canAccessDashboard = false,
  userRole,
  isAdmin,
}: MobileBottomNavProps) {
  canAccessDashboard = canAccessDashboard || !!isAdmin;
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    if (drawerOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [drawerOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* ── Bottom Bar ────────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-outline-variant bg-surface-container-lowest/90 shadow-[0_16px_50px_rgba(28,32,51,0.18)] backdrop-blur-xl safe-area-bottom"
      >
        <div
          className={`grid items-center h-16 px-1 ${canAccessDashboard || userRole ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <Link
            href="/"
            aria-current={activeTab === "feed" ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-200 ${
              activeTab === "feed"
                ? "bg-primary/10 text-primary"
                : "text-on-surface-variant active:bg-surface-container"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[11px] font-semibold tracking-wide">
              Stories
            </span>
          </Link>

          <Link
            href="/explore"
            aria-current={activeTab === "explore" ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-200 ${
              activeTab === "explore"
                ? "bg-primary/10 text-primary"
                : "text-on-surface-variant active:bg-surface-container"
            }`}
          >
            <Compass className="w-6 h-6" />
            <span className="text-[11px] font-semibold tracking-wide">
              All stories
            </span>
          </Link>

          {(canAccessDashboard || userRole) && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-200 ${
                drawerOpen
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant active:bg-surface-container"
              }`}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <Menu className="w-6 h-6" />
              <span className="text-[11px] font-label tracking-wide">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Bottom Sheet Overlay ──────────────────────────── */}
      {(canAccessDashboard || userRole) && drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          className="fixed inset-0 z-[60] md:hidden"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          <div
            className={`absolute bottom-0 inset-x-0 bg-surface-container-low rounded-t-2xl transform transition-transform duration-300 ease-out ${
              drawerOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-surface-container-highest" />
            </div>

            <div className="flex items-center justify-between px-6 pb-3">
              <span
                id="mobile-menu-title"
                className="text-lg font-headline font-bold tracking-tight text-on-surface"
              >
                Menu
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <nav aria-label="Account navigation" className="px-4 pb-8">
              <ul className="space-y-1">
                {userRole === "AGENT" ? (
                  <li>
                    <Link
                      href="/agent"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 py-3 px-4 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all duration-200"
                    >
                      <User className="w-5 h-5" />
                      Account
                    </Link>
                  </li>
                ) : canAccessDashboard ? (
                  <li>
                    <Link
                      href="/dashboard"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 ${
                        activeTab === "dashboard"
                          ? "text-primary bg-primary/10"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      Dashboard
                    </Link>
                  </li>
                ) : null}
                <li>
                  <form action="/api/auth/sign-out" method="POST">
                    <button
                      type="submit"
                      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all duration-200"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </form>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
