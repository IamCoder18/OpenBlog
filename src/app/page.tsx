import Link from "next/link";
import { ArrowRight, FileText, PenLine } from "lucide-react";
import LoadMorePosts from "@/components/LoadMorePosts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { postInclude } from "@/lib/posts";
import { rankHomepagePosts } from "@/lib/post-ranking";
import { getPublicationSettings, getSiteProfile } from "@/lib/site-settings";

async function getHomepagePosts() {
  const posts = await prisma.post.findMany({
    where: { visibility: "PUBLIC" },
    include: postInclude,
  });
  const ranked = rankHomepagePosts(posts);
  return {
    posts: ranked.slice(0, 12).map(post => ({
      ...post,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
    })),
    total: ranked.length,
  };
}

export default async function Home() {
  const [{ posts, total }, { user }, profile, publication] = await Promise.all([
    getHomepagePosts(),
    getSession(),
    getSiteProfile(),
    getPublicationSettings(),
  ]);
  const canWrite = user?.role === "ADMIN" || user?.role === "AUTHOR";
  const topics = Array.from(
    new Set(posts.flatMap(post => post.metadata?.tags ?? []))
  ).slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col text-on-surface">
      <Navbar activeLink="feed" user={user} />

      <main id="main-content" className="flex-1 pb-28 pt-28 md:pt-32">
        <header className="site-container publication-reveal mb-10 border-b border-outline-variant pb-8 md:mb-12 md:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="font-headline text-[clamp(2.5rem,6vw,4.75rem)] font-extrabold leading-[0.98] tracking-[-0.055em]">
                {profile.name}
              </h1>
              {publication.homepage.showDescription && profile.description && (
                <p className="mt-5 max-w-2xl text-lg leading-8 text-on-surface-variant">
                  {profile.description}
                </p>
              )}
            </div>
            <Link href="/explore" className="btn-secondary">
              All stories <ArrowRight className="size-4" />
            </Link>
          </div>
        </header>

        {publication.homepage.showTopics && topics.length > 0 && (
          <nav
            aria-label="Browse by topic"
            className="site-container publication-reveal mb-10 flex flex-wrap items-center gap-2"
          >
            <span className="mr-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Topics
            </span>
            {topics.map(topic => (
              <Link
                key={topic}
                href={`/topics/${encodeURIComponent(topic)}`}
                className="rounded-full bg-surface-container px-3.5 py-2 text-xs font-semibold text-on-surface-variant transition-all hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary"
              >
                {topic}
              </Link>
            ))}
          </nav>
        )}

        <div className="site-container">
          {posts.length ? (
            <LoadMorePosts initialPosts={posts} initialTotal={total} />
          ) : (
            <section className="settings-panel publication-reveal py-16 text-center">
              <FileText className="mx-auto size-10 text-primary" />
              <h2 className="mt-5 text-2xl font-bold">
                No stories published yet
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-on-surface-variant">
                Published articles will appear here as soon as they are
                available.
              </p>
              {canWrite && (
                <Link href="/dashboard/editor" className="btn-primary mt-6">
                  <PenLine className="size-4" /> Write the first story
                </Link>
              )}
            </section>
          )}
        </div>
      </main>

      <Footer />
      <MobileBottomNav
        activeTab="feed"
        canAccessDashboard={canWrite}
        userRole={user?.role}
      />
    </div>
  );
}
