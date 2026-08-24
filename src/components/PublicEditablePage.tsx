import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LatexRenderer from "@/components/LatexRenderer";
import { renderMarkdown } from "@/lib/markdown";
import { getSession } from "@/lib/session";
import { getPublicationSettings, getSiteProfile } from "@/lib/site-settings";

export type PublicPageKey = "about" | "contact" | "privacy" | "terms";

export default async function PublicEditablePage({
  pageKey,
}: {
  pageKey: PublicPageKey;
}) {
  const [{ user }, publication, profile] = await Promise.all([
    getSession(),
    getPublicationSettings(),
    getSiteProfile(),
  ]);
  const page = publication.pages[pageKey];
  if (!page.enabled) notFound();
  const { html } = await renderMarkdown(page.bodyMarkdown);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main
        id="main-content"
        className="site-container max-w-3xl flex-1 pb-24 pt-28"
      >
        <header className="publication-reveal border-b border-outline-variant pb-8">
          <h1 className="font-headline text-5xl font-extrabold tracking-[-0.055em] sm:text-6xl">
            {page.title}
          </h1>
        </header>
        <article className="prose publication-reveal mt-10 max-w-none">
          <LatexRenderer html={html} />
          {pageKey === "contact" && profile.contactEmail && (
            <p>
              <a href={`mailto:${profile.contactEmail}`}>
                {profile.contactEmail}
              </a>
            </p>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
