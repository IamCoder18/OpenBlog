import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import LatexRenderer from "@/components/LatexRenderer";
import ShareButton from "@/components/ShareButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DesktopBackLink from "@/components/DesktopBackLink";
import ReadingProgress from "@/components/ReadingProgress";
import { getSession } from "@/lib/session";
import { ArrowRight, FileEdit, User } from "lucide-react";
import { getPublicPostBySlug } from "@/lib/posts";
import { config } from "@/lib/config";
import { stripMarkdown } from "@/lib/strip-markdown";
import { prisma } from "@/lib/db";
import FeaturedBadge from "@/components/FeaturedBadge";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface MetadataType {
  readTime?: number;
  category?: string;
  seoDescription?: string;
  tags?: string[];
  coverImage?: string;
  coverImageAlt?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  publishedAt: string | null;
  isPinned: boolean;
  isFeatured: boolean;
  author: Author;
  metadata: MetadataType | null;
}

async function getPost(slug: string): Promise<Post | null> {
  const result = await getPublicPostBySlug(slug);
  return result?.post
    ? ({
        ...result.post,
        publishedAt: result.post.publishedAt?.toISOString() ?? null,
      } as Post)
    : null;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getReadTime(bodyMarkdown: string): string {
  const wordsPerMinute = 200;
  const words = bodyMarkdown?.split(/\s+/).length || 0;
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  return `${minutes} min read`;
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return { title: `Post Not Found | ${config.BLOG_NAME}` };
  }

  return {
    title: `${post.title} | ${config.BLOG_NAME}`,
    description:
      post.metadata?.seoDescription || stripMarkdown(post.bodyMarkdown, 160),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description:
        post.metadata?.seoDescription || stripMarkdown(post.bodyMarkdown, 160),
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt || undefined,
      authors: post.author.name ? [post.author.name] : undefined,
      ...(post.metadata?.coverImage && {
        images: [{ url: post.metadata.coverImage }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description:
        post.metadata?.seoDescription || stripMarkdown(post.bodyMarkdown, 160),
      ...(post.metadata?.coverImage && {
        images: [post.metadata.coverImage],
      }),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getPublicPostBySlug(slug);

  if (!result) {
    notFound();
  }
  if (result.redirected) permanentRedirect(`/blog/${result.post.slug}`);
  const post = {
    ...result.post,
    publishedAt: result.post.publishedAt?.toISOString() ?? null,
  } as Post;

  const { user } = await getSession();
  const canEdit = user && (user.role === "ADMIN" || user.id === post.author.id);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author.name || "Anonymous",
      url: `${config.BASE_URL}/authors/${post.author.id}`,
    },
    publisher: { "@type": "Organization", name: config.BLOG_NAME },
    mainEntityOfPage: `${config.BASE_URL}/blog/${post.slug}`,
    ...(post.metadata?.coverImage ? { image: post.metadata.coverImage } : {}),
  };

  return (
    <div className="min-h-screen flex flex-col text-on-surface">
      <Navbar user={user} />
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <main id="main-content" className="flex-1 pb-24 pt-28 md:pt-32">
        <div className="site-container max-w-[52rem]">
          <DesktopBackLink />
        </div>

        <header className="site-container mb-10 max-w-[52rem] animate-fade-in-up">
          {post.isFeatured && <FeaturedBadge className="mb-5" />}
          {post.metadata?.category && (
            <span className="mb-6 inline-flex rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
              {post.metadata.category}
            </span>
          )}

          <h1 className="font-headline text-[clamp(2.8rem,7vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.06em] text-on-surface">
            {post.title}
          </h1>

          {post.metadata?.seoDescription && (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-on-surface-variant sm:text-xl">
              {post.metadata.seoDescription}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-5">
            <div className="flex items-center space-x-4">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-surface-container">
                {post.author.image ? (
                  <img
                    className="w-full h-full object-cover"
                    src={post.author.image}
                    alt={post.author.name || ""}
                    width="48"
                    height="48"
                  />
                ) : (
                  <User className="w-5 h-5 text-on-surface-variant" />
                )}
              </div>
              <div>
                <Link
                  href={`/authors/${post.author.id}`}
                  className="text-sm font-bold text-on-surface hover:text-primary"
                >
                  {post.author.name || "Anonymous"}
                </Link>
                <div className="mt-0.5 flex items-center space-x-2 text-xs text-on-surface-variant">
                  <time dateTime={post.publishedAt || undefined}>
                    {formatDate(post.publishedAt)}
                  </time>
                  <span>&middot;</span>
                  <span>{getReadTime(post.bodyMarkdown)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {canEdit && (
                <Link
                  href={`/dashboard/editor?slug=${post.slug}`}
                  aria-label={`Edit ${post.title}`}
                  className="grid min-h-11 min-w-11 place-items-center rounded-full text-on-surface-variant transition-all hover:bg-surface-container hover:text-primary"
                >
                  <FileEdit className="w-4 h-4" />
                </Link>
              )}
              <ShareButton title={post.title} slug={post.slug} />
            </div>
          </div>

          {post.metadata?.tags && post.metadata.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.metadata.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/topics/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        {post.metadata?.coverImage && (
          <div className="story-media site-container mb-14 aspect-[16/9] max-w-6xl overflow-hidden rounded-3xl shadow-[0_24px_70px_rgba(28,32,51,0.12)] animate-fade-in-up delay-100">
            <img
              src={post.metadata.coverImage}
              alt={post.metadata.coverImageAlt || ""}
              width="1200"
              height="675"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="site-container max-w-3xl">
          <article className="prose prose-lg max-w-none prose-headings:font-headline prose-headings:font-bold prose-headings:tracking-tight prose-a:no-underline hover:prose-a:underline prose-code:rounded prose-code:bg-surface-container prose-code:px-2 prose-code:py-0.5 prose-img:rounded-2xl">
            <LatexRenderer html={post.bodyHtml} />
          </article>

          <RelatedStories postId={post.id} tags={post.metadata?.tags ?? []} />
        </div>
      </main>

      <Footer />
    </div>
  );
}

async function RelatedStories({
  postId,
  tags,
}: {
  postId: string;
  tags: string[];
}) {
  const posts = await prisma.post.findMany({
    where: {
      id: { not: postId },
      visibility: "PUBLIC",
      ...(tags.length ? { metadata: { tags: { hasSome: tags } } } : {}),
    },
    select: { slug: true, title: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });
  if (!posts.length)
    return (
      <Link href="/explore" className="btn-secondary mt-14">
        Explore more stories <ArrowRight className="size-4" />
      </Link>
    );
  return (
    <aside
      className="mt-20 border-t border-outline-variant pt-10"
      aria-labelledby="related-title"
    >
      <span className="eyebrow">Up next</span>
      <h2 id="related-title" className="mb-6 mt-2 text-3xl font-bold">
        Continue reading
      </h2>
      <div className="grid gap-3">
        {posts.map(related => (
          <Link
            key={related.slug}
            href={`/blog/${related.slug}`}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary hover:shadow-lg"
          >
            <span>{related.title}</span>
            <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
