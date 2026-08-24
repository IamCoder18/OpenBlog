import Link from "next/link";
import { ArrowUpRight, Clock3, Pin } from "lucide-react";
import FeaturedBadge from "@/components/FeaturedBadge";
import { stripMarkdown } from "@/lib/strip-markdown";

export interface PublicStory {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  publishedAt: string | Date | null;
  createdAt?: string | Date;
  isPinned: boolean;
  isFeatured: boolean;
  author: { id?: string; name: string | null; image?: string | null };
  metadata: {
    seoDescription?: string | null;
    coverImage?: string | null;
    coverImageAlt?: string | null;
    tags?: string[];
  } | null;
}

function readTime(markdown: string) {
  return Math.max(1, Math.ceil(markdown.trim().split(/\s+/).length / 220));
}

function dateValue(post: PublicStory): Date | null {
  const value = post.publishedAt ?? post.createdAt;
  return value ? new Date(value) : null;
}

export default function PublicStoryCard({
  post,
  priority = false,
  index = 0,
}: {
  post: PublicStory;
  priority?: boolean;
  index?: number;
}) {
  const date = dateValue(post);
  const excerpt =
    post.metadata?.seoDescription || stripMarkdown(post.bodyMarkdown, 180);
  return (
    <article
      className={`story-card group flex min-h-full flex-col ${priority ? "lg:first:col-span-2" : ""}`}
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <Link
        href={`/blog/${post.slug}`}
        className={`publication-cover story-media block ${priority ? "aspect-[16/8]" : "aspect-[16/10]"}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {post.metadata?.coverImage ? (
          <img
            src={post.metadata.coverImage}
            alt=""
            width={priority ? "960" : "640"}
            height={priority ? "480" : "400"}
            loading={index > 2 ? "lazy" : "eager"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-8">
            <span className="max-w-sm text-center font-headline text-2xl font-bold text-[#25283a]/75">
              {post.title}
            </span>
          </div>
        )}
        <span className="cover-badges absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {post.isFeatured && <FeaturedBadge />}
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[#25283a] shadow-sm">
              <Pin className="size-3" aria-hidden="true" /> Pinned
            </span>
          )}
        </span>
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface-variant">
          {post.author.id ? (
            <Link
              href={`/authors/${post.author.id}`}
              className="hover:text-primary"
            >
              {post.author.name || "Anonymous"}
            </Link>
          ) : (
            <span>{post.author.name || "Anonymous"}</span>
          )}
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {readTime(post.bodyMarkdown)} min read
          </span>
        </div>
        <div className="no-cover-badges mb-3 flex flex-wrap gap-2">
          {post.isFeatured && <FeaturedBadge />}
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant">
              <Pin className="size-3" aria-hidden="true" /> Pinned
            </span>
          )}
        </div>
        <h3
          className={`${priority ? "text-2xl sm:text-3xl" : "text-xl"} font-bold leading-tight tracking-[-0.03em]`}
        >
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        {excerpt && (
          <p className="mt-3 line-clamp-3 leading-6 text-on-surface-variant">
            {excerpt}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          {date ? (
            <time
              dateTime={date.toISOString()}
              className="text-xs text-on-surface-variant"
            >
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
              }).format(date)}
            </time>
          ) : (
            <span />
          )}
          <Link
            href={`/blog/${post.slug}`}
            aria-label={`Read ${post.title}`}
            className="grid size-10 place-items-center rounded-full bg-surface-container transition-all duration-200 group-hover:rotate-3 group-hover:bg-primary group-hover:text-white"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
