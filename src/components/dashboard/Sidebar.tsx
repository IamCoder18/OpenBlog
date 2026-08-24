"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import {
  BarChart3,
  BookOpen,
  User,
  Settings,
  Shield,
  Menu,
  Plus,
  X,
  Home,
  PenLine,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

interface SidebarProps {
  userName: string;
  userRole: string;
  userEmail: string;
  publicationName: string;
}

export default function Sidebar({
  userName,
  userRole,
  userEmail,
  publicationName,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = userRole === "ADMIN";
  const adminMode = isAdmin && searchParams.get("mode") === "admin";
  const [mobileOpen, setMobileOpen] = useState(false);

  const modeQS = useMemo(() => (adminMode ? "?mode=admin" : ""), [adminMode]);

  const toggleMode = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (adminMode) {
      params.delete("mode");
    } else {
      params.set("mode", "admin");
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [adminMode, pathname, router, searchParams]);

  const personalNav = [
    { href: "/dashboard", icon: BarChart3, label: "Analytics" },
    { href: "/dashboard/stories", icon: BookOpen, label: "Stories" },
    { href: "/dashboard/account", icon: User, label: "Account" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  const adminNav = [
    { href: "/dashboard", icon: BarChart3, label: "Site Analytics" },
    { href: "/dashboard/stories", icon: BookOpen, label: "All Stories" },
    { href: "/dashboard/account", icon: User, label: "Account" },
    {
      href: "/dashboard/settings",
      icon: Shield,
      label: "Admin Settings",
    },
  ];

  const navItems = adminMode ? adminNav : personalNav;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-lowest/90 px-4 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open dashboard navigation"
          aria-expanded={mobileOpen}
          className="min-w-11 min-h-11 grid place-items-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-headline font-bold tracking-tight text-on-surface">
          Workspace
        </span>
        <Link
          href="/dashboard/editor"
          aria-label="Create a new story"
          className="editorial-gradient grid min-h-11 min-w-11 place-items-center rounded-full text-white shadow-md"
        >
          <Plus className="w-5 h-5" />
        </Link>
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
        aria-label="Dashboard navigation"
        className={`fixed left-0 top-0 z-[70] flex h-full w-72 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-5 pt-5">
          <Link
            href={`/dashboard${modeQS}`}
            className="group flex min-w-0 items-center gap-2.5 font-headline font-extrabold tracking-[-0.035em] text-on-surface"
          >
            <span className="editorial-gradient grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:-rotate-3">
              <PenLine className="size-[1.1rem]" />
            </span>
            <span className="min-w-0 truncate">{publicationName}</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close dashboard navigation"
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Post CTA */}
        <div className="mb-5 px-4">
          <Link href="/dashboard/editor" className="btn-primary w-full">
            <Plus className="w-5 h-5" />
            Write a story
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard sections" className="flex-1 space-y-1 px-3">
          {/* Section label */}
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant/60">
            {adminMode ? "Publication" : "Workspace"}
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${item.href}${modeQS}`}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-primary text-white shadow-[0_8px_20px_rgba(var(--theme-shadow-rgb),0.18)]"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admin Mode Toggle */}
        {isAdmin && (
          <div className="px-4 mb-4">
            <div className="rounded-2xl border border-outline-variant bg-surface-container p-4">
              <button
                onClick={toggleMode}
                aria-pressed={adminMode}
                className="w-full min-h-11 text-left group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                    Publication view
                  </span>
                  <div
                    className={`relative w-[42px] h-[24px] rounded-full transition-colors duration-300 ${
                      adminMode
                        ? "bg-primary-container"
                        : "bg-surface-container-highest"
                    }`}
                  >
                    <div
                      className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ${
                        adminMode ? "translate-x-[18px]" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">
                  {adminMode
                    ? "Viewing site-wide data"
                    : "Viewing your workspace"}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* User / Logout */}
        <div className="border-t border-outline-variant px-4 pb-4 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
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
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
