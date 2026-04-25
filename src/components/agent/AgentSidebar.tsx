"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { User, Key, Menu, X, Home } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

interface AgentSidebarProps {
  userName: string;
  userRole: string;
  userEmail: string;
  userImage: string | null;
}

export default function AgentSidebar({
  userName,
  userRole,
  userEmail,
  userImage,
}: AgentSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/agent/profile", icon: User, label: "Profile" },
  ];

  if (userRole === "AGENT") {
    navItems.push({
      href: "/agent/keys",
      icon: Key,
      label: "API Keys",
    });
  }

  const isActive = (href: string) => pathname === href;

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/10 flex items-center justify-between px-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        <span className="font-headline font-bold text-on-surface tracking-tight">
          Account
        </span>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[70] h-full w-72 bg-surface-container-low flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <Link
            href="/agent"
            className="font-headline text-lg font-bold text-on-surface tracking-tight hover:text-primary transition-colors"
          >
            Account
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-label px-3 py-2">
            Settings
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="px-4 pb-4 border-t border-outline-variant/10 pt-4">
          <div className="flex items-center gap-3 mb-3">
            {userImage ? (
              <img
                src={userImage}
                alt={userName}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-on-primary-container">
                  {initials}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-on-surface truncate">
                {userName}
              </div>
              <div className="text-[10px] text-on-surface-variant truncate">
                {userEmail}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
              {userRole}
            </span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              View Site
            </Link>
            <div className="flex-1">
              <LogoutButton variant="sidebar" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
