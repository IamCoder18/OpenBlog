import Link from "next/link";
import LogoutButton from "./LogoutButton";
import MobileBackButton from "./MobileBackButton";
import { config } from "@/lib/config";
import { getSession } from "@/lib/session";

interface NavbarProps {
  activeLink?: "feed" | "explore" | "dashboard";
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  blogName?: string;
}

export default async function Navbar({
  activeLink = "feed",
  showBack,
  backHref = "/",
  backLabel = "Back to Feed",
  blogName,
}: NavbarProps) {
  const name = blogName || config.BLOG_NAME;
  const { user } = await getSession();
  const canAccessDashboard = user?.role === "ADMIN" || user?.role === "AUTHOR";

  return (
    <nav className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-violet-500/5 transition-all duration-300 animate-fade-in-down">
      <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto font-headline tracking-tight antialiased text-sm font-medium">
        <div className="flex items-center gap-2 md:gap-8">
          <MobileBackButton />
          <Link
            href="/"
            className="text-xl font-bold tracking-tighter text-zinc-100 hover:text-primary transition-colors duration-300"
          >
            {name}
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`${activeLink === "feed" ? "text-violet-300 border-b-2 border-violet-500 pb-1" : "text-zinc-400 hover:text-zinc-100"} transition-colors duration-300`}
            >
              Feed
            </Link>
            <Link
              href="/explore"
              className={`${activeLink === "explore" ? "text-violet-300 border-b-2 border-violet-500 pb-1" : "text-zinc-400 hover:text-zinc-100"} transition-colors duration-300`}
            >
              Explore
            </Link>
            {canAccessDashboard && (
              <Link
                href="/dashboard"
                className={`${activeLink === "dashboard" ? "text-violet-300 border-b-2 border-violet-500 pb-1" : "text-zinc-400 hover:text-zinc-100"} transition-colors duration-300`}
              >
                Dashboard
              </Link>
            )}
            {user && (
              <Link
                href="/agent"
                className="text-zinc-400 hover:text-zinc-100 transition-colors duration-300"
              >
                Account
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {showBack && (
            <Link
              href={backHref}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors rounded-lg hover:bg-zinc-800/50"
            >
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              {backLabel}
            </Link>
          )}
          {user && <LogoutButton />}
        </div>
      </div>
    </nav>
  );
}
