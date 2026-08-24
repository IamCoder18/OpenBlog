import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  PenLine,
  Search,
  UserRound,
} from "lucide-react";
import LogoutButton from "./LogoutButton";
import MobileBackButton from "./MobileBackButton";
import ColorModeToggle from "./ColorModeToggle";
import { getPublicationSettings, getSiteProfile } from "@/lib/site-settings";

interface NavbarProps {
  activeLink?: "feed" | "explore" | "dashboard";
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  blogName?: string;
  user?: {
    id: string;
    name: string;
    role: "ADMIN" | "AUTHOR" | "AGENT" | "GUEST";
  } | null;
}

export default async function Navbar({
  activeLink = "feed",
  showBack,
  backHref = "/",
  backLabel = "Back to Feed",
  blogName,
  user,
}: NavbarProps) {
  const [profile, publication] = await Promise.all([
    getSiteProfile(),
    getPublicationSettings(),
  ]);
  const name = blogName || profile.name;
  const canAccessDashboard = user?.role === "ADMIN" || user?.role === "AUTHOR";

  return (
    <nav
      aria-label="Primary navigation"
      className="theme-nav fixed top-0 w-full z-50 backdrop-blur-xl transition-all duration-300"
    >
      <div className="site-container h-[4.5rem] flex items-center justify-between font-body text-sm">
        <div className="flex items-center gap-1 md:gap-7">
          <MobileBackButton />
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-lg font-extrabold tracking-[-0.04em] text-on-surface"
          >
            {profile.logoUrl && !blogName ? (
              <img
                src={profile.logoUrl}
                alt=""
                width="32"
                height="32"
                className="w-8 h-8 rounded-xl object-contain"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-xl editorial-gradient text-white shadow-sm transition-transform duration-200 group-hover:-rotate-3"
              >
                <PenLine className="size-4" />
              </span>
            )}
            <span>{name}</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              aria-current={activeLink === "feed" ? "page" : undefined}
              className={`${activeLink === "feed" ? "theme-nav-link-active" : "theme-nav-link"} transition-colors duration-300`}
            >
              Stories
            </Link>
            <Link
              href="/explore"
              aria-current={activeLink === "explore" ? "page" : undefined}
              className={`${activeLink === "explore" ? "theme-nav-link-active" : "theme-nav-link"} transition-colors duration-300`}
            >
              All stories
            </Link>
            {publication.pages.about.enabled && (
              <Link
                href="/about"
                className="theme-nav-link transition-colors duration-300"
              >
                {publication.pages.about.title}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/explore"
            aria-label="Search stories"
            className="grid min-h-11 min-w-11 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Search className="size-[1.15rem]" />
          </Link>
          <ColorModeToggle />
          {showBack && (
            <Link
              href={backHref}
              className="hidden md:flex items-center gap-2 btn-tertiary"
            >
              <ArrowLeft className="w-5 h-5" />
              {backLabel}
            </Link>
          )}
          {canAccessDashboard && (
            <Link
              href="/dashboard"
              className="btn-primary !hidden sm:!inline-flex"
            >
              <LayoutDashboard className="size-4" />
              Workspace
            </Link>
          )}
          {user?.role === "AGENT" && (
            <Link
              href="/agent"
              className="btn-secondary !hidden sm:!inline-flex"
            >
              <UserRound className="size-4" />
              Account
            </Link>
          )}
          {user && <LogoutButton />}
        </div>
      </div>
    </nav>
  );
}
