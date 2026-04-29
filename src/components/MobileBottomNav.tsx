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
  isAdmin?: boolean;
  isAuthenticated?: boolean;
  userRole?: string;
}

export default function MobileBottomNav({
  activeTab,
  isAdmin = false,
  isAuthenticated = false,
  userRole,
}: MobileBottomNavProps) {
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
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-surface/70 backdrop-blur-xl safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center gap-0.5 px-6 py-2 rounded-lg transition-colors duration-200 ${
              activeTab === "feed"
                ? "text-primary"
                : "text-on-surface-variant active:bg-surface-container"
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[11px] font-label tracking-wide">Feed</span>
          </Link>

          <Link
            href="/explore"
            className={`flex flex-col items-center justify-center gap-0.5 px-6 py-2 rounded-lg transition-colors duration-200 ${
              activeTab === "explore"
                ? "text-primary"
                : "text-on-surface-variant active:bg-surface-container"
            }`}
          >
            <Compass className="w-6 h-6" />
            <span className="text-[11px] font-label tracking-wide">
              Explore
            </span>
          </Link>

          {isAuthenticated && userRole === "AGENT" && (
            <Link
              href="/agent"
              className="flex flex-col items-center justify-center gap-0.5 px-6 py-2 rounded-lg transition-colors duration-200 text-on-surface-variant active:bg-surface-container"
            >
              <User className="w-6 h-6" />
              <span className="text-[11px] font-label tracking-wide">
                Account
              </span>
            </Link>
          )}

          {isAdmin && (
            <button
              onClick={() => setDrawerOpen(true)}
              className={`flex flex-col items-center justify-center gap-0.5 px-6 py-2 rounded-lg transition-colors duration-200 ${
                drawerOpen
                  ? "text-primary"
                  : "text-on-surface-variant active:bg-surface-container"
              }`}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
              <span className="text-[11px] font-label tracking-wide">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Bottom Sheet Overlay ──────────────────────────── */}
      {isAdmin && (
        <div
          className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
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
              <span className="text-lg font-headline font-bold tracking-tight text-on-surface">
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

            <nav className="px-4 pb-8">
              <ul className="space-y-1">
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
