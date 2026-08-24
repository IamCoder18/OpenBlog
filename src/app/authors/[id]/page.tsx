import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { stripMarkdown } from "@/lib/strip-markdown";
import { ArrowUpRight } from "lucide-react";
import FeaturedBadge from "@/components/FeaturedBadge";

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const [{ user: viewer }, author] = await Promise.all([
    getSession(),
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        posts: {
          where: { visibility: "PUBLIC" },
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            slug: true,
            title: true,
            bodyMarkdown: true,
            publishedAt: true,
            isFeatured: true,
          },
        },
      },
    }),
  ]);
  if (!author) notFound();
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={viewer} />
      <main
        id="main-content"
        className="site-container max-w-5xl flex-1 pb-24 pt-28"
      >
        <header className="flex flex-col gap-6 rounded-3xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm sm:flex-row sm:items-center sm:p-10">
          {author.image ? (
            <img
              src={author.image}
              alt=""
              width="80"
              height="80"
              className="size-24 rounded-3xl object-cover"
            />
          ) : (
            <div className="grid size-24 place-items-center rounded-3xl bg-primary/10 text-3xl font-bold text-primary">
              {author.name.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="eyebrow">Author</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
              {author.name}
            </h1>
            <p className="text-on-surface-variant mt-1">
              {author.posts.length} public{" "}
              {author.posts.length === 1 ? "story" : "stories"}
            </p>
          </div>
        </header>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {author.posts.map(post => (
            <article key={post.id} className="story-card flex flex-col p-6">
              {post.isFeatured && <FeaturedBadge className="mb-4 self-start" />}
              <h2 className="text-2xl font-bold tracking-[-0.03em]">
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
              {post.publishedAt && (
                <time
                  className="mt-5 block text-xs text-on-surface-variant"
                  dateTime={post.publishedAt.toISOString()}
                >
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                  }).format(post.publishedAt)}
                </time>
              )}
              <Link
                href={`/blog/${post.slug}`}
                aria-label={`Read ${post.title}`}
                className="mt-5 grid size-10 place-items-center self-end rounded-full bg-surface-container transition-colors hover:bg-primary hover:text-white"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </article>
          ))}
          {!author.posts.length && (
            <p className="col-span-full rounded-3xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant">
              This author has no public stories yet.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
