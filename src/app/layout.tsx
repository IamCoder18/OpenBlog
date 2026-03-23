import type { Metadata, Viewport } from "next";
import { Manrope, Inter } from "next/font/google";
import { config } from "@/lib/config";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import ClientProviders from "@/components/ClientProviders";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export function generateMetadata(): Metadata {
  const blogName = config.BLOG_NAME;
  return {
    title: blogName,
    description: `A modern blog platform with an editorial aesthetic. Powered by ${blogName}.`,
    openGraph: {
      title: blogName,
      description: `A modern blog platform with an editorial aesthetic. Powered by ${blogName}.`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: blogName,
      description: `A modern blog platform with an editorial aesthetic. Powered by ${blogName}.`,
    },
  };
}

export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface">
        <ClientProviders>
          <AnalyticsTracker />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
