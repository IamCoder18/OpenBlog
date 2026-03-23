import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { config } from "@/lib/config";

interface SidebarProps {
  blogName?: string;
  activeItem?: "analytics" | "stories" | "settings" | "editor";
}

export default function Sidebar({
  activeItem = "analytics",
  blogName,
}: SidebarProps) {
  const name = blogName || config.BLOG_NAME;
  const navItems = [
    {
      id: "analytics" as const,
      icon: "insights",
      label: "Analytics",
      href: "/dashboard",
    },
    {
      id: "stories" as const,
      icon: "auto_stories",
      label: "Stories",
      href: "/dashboard/stories",
    },
    {
      id: "settings" as const,
      icon: "settings_suggest",
      label: "Settings",
      href: "/dashboard/settings",
    },
  ];

  return (
    <aside className="h-[calc(100vh-64px)] w-64 fixed left-0 top-16 z-40 bg-zinc-900 flex flex-col py-6 space-y-2 font-body text-sm tracking-normal">
      <div className="text-lg font-semibold text-zinc-100 mb-6 px-4 font-headline">
        {name} Admin
      </div>

      {/* New Post Button */}
      <div className="px-4 mb-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-label">
          Editorial Suite
        </div>
        <Link
          href="/dashboard/editor"
          className="w-full py-2.5 px-4 editorial-gradient text-on-primary font-medium rounded-lg text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Post
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {navItems.map(item => {
          const isActive = activeItem === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 py-3 px-6 transition-all duration-200 ${
                isActive
                  ? "bg-violet-500/10 text-violet-300 border-r-2 border-violet-500"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-auto px-4">
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  );
}
