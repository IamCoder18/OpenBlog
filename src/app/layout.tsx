import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import { headers } from "next/headers";
import { config, getTheme } from "@/lib/config";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import ClientProviders from "@/components/ClientProviders";
import "./globals.css";
import "katex/dist/katex.min.css";
import { getSiteProfile } from "@/lib/site-settings";
import { getPublicationSettings } from "@/lib/site-settings";
import { publicationCss } from "@/lib/publication-settings.shared";

// Site identity, theme, and session-aware navigation are database-backed.
export const dynamic = "force-dynamic";

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-interface",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile();
  const blogName = profile.name;
  const metadataBase = new URL(config.BASE_URL);
  return {
    metadataBase,
    alternates: { canonical: "/" },
    other: {
      "rss-feed": `${config.BASE_URL}/feed.xml`,
    },
    title: blogName,
    description: profile.description,
    openGraph: {
      title: blogName,
      description: profile.description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: blogName,
      description: profile.description,
    },
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, publication, profile, requestHeaders] = await Promise.all([
    getTheme(),
    getPublicationSettings(),
    getSiteProfile(),
    headers(),
  ]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      data-theme={theme}
      data-color-mode="system"
      data-font={publication.appearance.fontStyle}
      data-radius={publication.appearance.radiusStyle}
      data-density={publication.appearance.density}
      data-card-layout={publication.appearance.cardLayout}
      data-show-covers={String(publication.appearance.showCoverImages)}
      data-motion={publication.appearance.motionStyle}
      suppressHydrationWarning
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${profile.name} RSS feed`}
          href="/feed.xml"
        />
        <style
          id="publication-theme"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: publicationCss(publication) }}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem("openblog-color-mode");if(m==="light"||m==="dark")document.documentElement.dataset.colorMode=m;else document.documentElement.dataset.colorMode="system"}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ClientProviders>
          <AnalyticsTracker />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
