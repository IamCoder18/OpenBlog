import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { stripMarkdown } from "@/lib/strip-markdown";
import { ArrowUpRight } from "lucide-react";
import FeaturedBadge from "@/components/FeaturedBadge";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const tag = decodeURIComponent((await params).tag)
    .trim()
    .toLowerCase();
  if (!tag || tag.length > 40) notFound();
  const [{ user }, posts] = await Promise.all([
    getSession(),
    prisma.post.findMany({
      where: { visibility: "PUBLIC", metadata: { tags: { has: tag } } },
      include: { author: { select: { name: true } }, metadata: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main
        id="main-content"
        className="site-container max-w-5xl flex-1 pb-24 pt-28"
      >
        <header className="relative overflow-hidden rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm sm:p-12">
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-16 size-56 rounded-full bg-primary/10 blur-3xl"
          />
          <p className="eyebrow">Topic</p>
          <h1 className="relative mt-3 text-5xl font-extrabold tracking-[-0.055em] sm:text-6xl">
            {tag}
          </h1>
          <p className="relative mt-4 text-on-surface-variant">
            {posts.length} {posts.length === 1 ? "story" : "stories"} exploring{" "}
            {tag}.
          </p>
        </header>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {posts.map(post => (
            <article key={post.id} className="story-card flex flex-col p-6">
              {post.isFeatured && <FeaturedBadge className="mb-4 self-start" />}
              <p className="text-xs font-semibold text-on-surface-variant">
                {post.author.name || "Anonymous"}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em]">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-primary"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 line-clamp-3 leading-7 text-on-surface-variant">
                {stripMarkdown(post.bodyMarkdown, 180)}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                aria-label={`Read ${post.title}`}
                className="mt-6 grid size-10 place-items-center self-end rounded-full bg-surface-container transition-colors hover:bg-primary hover:text-white"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </article>
          ))}
          {!posts.length && (
            <div className="col-span-full rounded-3xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant">
              No public stories use this topic yet.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
