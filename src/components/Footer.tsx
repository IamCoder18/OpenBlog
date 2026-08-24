import Link from "next/link";
import { ExternalLink, PenLine, Rss } from "lucide-react";
import { getPublicationSettings, getSiteProfile } from "@/lib/site-settings";

interface FooterProps {
  className?: string;
  blogName?: string;
}

export default async function Footer({
  className = "",
  blogName,
}: FooterProps) {
  const [profile, publication] = await Promise.all([
    getSiteProfile(),
    getPublicationSettings(),
  ]);
  const name = blogName || profile.name;
  const pageLinks = (["about", "contact", "privacy", "terms"] as const)
    .filter(key => publication.pages[key].enabled)
    .map(key => ({ href: `/${key}`, label: publication.pages[key].title }));

  return (
    <footer
      className={`w-full border-t border-outline-variant bg-surface-container-lowest pb-28 pt-10 md:py-12 ${className}`}
    >
      <div className="site-container grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-[-0.04em]"
          >
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt=""
                width="32"
                height="32"
                className="size-8 rounded-[var(--radius-control)] object-contain"
              />
            ) : (
              <span className="grid size-8 place-items-center rounded-[var(--radius-control)] editorial-gradient text-white">
                <PenLine className="size-4" />
              </span>
            )}
            {name}
          </Link>
          {profile.description && (
            <p className="mt-3 max-w-md text-sm leading-6 text-on-surface-variant">
              {profile.description}
            </p>
          )}
        </div>
        <div className="md:text-right">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-on-surface-variant md:justify-end"
          >
            <Link href="/explore" className="hover:text-on-surface">
              All stories
            </Link>
            {pageLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-on-surface"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 hover:text-on-surface"
            >
              <Rss className="size-3.5" /> RSS
            </a>
            {profile.socialUrl && (
              <a
                href={profile.socialUrl}
                rel="me noreferrer"
                className="inline-flex items-center gap-1 hover:text-on-surface"
              >
                Social <ExternalLink className="size-3" />
              </a>
            )}
          </nav>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-on-surface-variant md:justify-end">
            <span>
              &copy; {new Date().getFullYear()} {name}
            </span>
            {publication.footer.poweredByOpenBlog && (
              <a
                href="https://github.com/IamCoder18/OpenBlog"
                rel="noreferrer"
                className="hover:text-on-surface"
              >
                Powered by OpenBlog
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
