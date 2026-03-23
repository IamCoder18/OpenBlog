"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import LogoutButton from "@/components/LogoutButton";

interface SidebarProps {
  userName: string;
  userRole: string;
  userEmail: string;
}

export default function Sidebar({
  userName,
  userRole,
  userEmail,
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
    { href: "/dashboard", icon: "insights", label: "Analytics" },
    { href: "/dashboard/stories", icon: "auto_stories", label: "Stories" },
    { href: "/dashboard/settings", icon: "tune", label: "Settings" },
  ];

  const adminNav = [
    { href: "/dashboard", icon: "analytics", label: "Site Analytics" },
    { href: "/dashboard/stories", icon: "library_books", label: "All Stories" },
    {
      href: "/dashboard/settings",
      icon: "admin_panel_settings",
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/10 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="font-headline font-bold text-on-surface tracking-tight">
          Dashboard
        </span>
        <Link
          href="/dashboard/editor"
          className="p-2 rounded-lg editorial-gradient text-on-primary"
        >
          <span className="material-symbols-outlined text-lg">add</span>
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
        className={`fixed top-0 left-0 z-[70] h-full w-72 bg-surface-container-low flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <Link
            href={`/dashboard${modeQS}`}
            className="font-headline text-lg font-bold text-on-surface tracking-tight hover:text-primary transition-colors"
          >
            Dashboard
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* New Post CTA */}
        <div className="px-4 mb-4">
          <Link
            href="/dashboard/editor"
            className="w-full py-2.5 px-4 editorial-gradient text-on-primary font-semibold rounded-lg text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Post
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {/* Section label */}
          <div className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-label px-3 py-2">
            {adminMode ? "Site Management" : "Your Workspace"}
          </div>

          {navItems.map(item => (
            <Link
              key={item.href}
              href={`${item.href}${modeQS}`}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}

          {/* Editor link — preserves mode so sidebar stays in admin/personal */}
          <Link
            href={`/dashboard/editor${modeQS}`}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === "/dashboard/editor"
                ? "bg-primary/10 text-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Editor
          </Link>
        </nav>

        {/* Admin Mode Toggle */}
        {isAdmin && (
          <div className="px-4 mb-4">
            <div className="bg-surface-container rounded-xl p-4">
              <button onClick={toggleMode} className="w-full text-left group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                    Admin Mode
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
        <div className="px-4 pb-4 border-t border-outline-variant/10 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-on-primary-container">
                {initials}
              </span>
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
              <span className="material-symbols-outlined text-sm">home</span>
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
