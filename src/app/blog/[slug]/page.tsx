import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import LatexRenderer from "@/components/LatexRenderer";
import RelatedPostsClient from "@/components/RelatedPostsClient";
import ShareButton from "@/components/ShareButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DesktopBackLink from "@/components/DesktopBackLink";
import { getSession } from "@/lib/session";
import { User, FileEdit } from "lucide-react";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface MetadataType {
  readTime?: number;
  category?: string;
  description?: string;
  tags?: string[];
  coverImage?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  publishedAt: string | null;
  author: Author;
  metadata: MetadataType | null;
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(
      `${process.env.BASE_URL || "http://localhost:3001"}/api/posts/${slug}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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
    return { title: "Post Not Found | OpenBlog" };
  }

  return {
    title: `${post.title} | OpenBlog`,
    description: post.metadata?.description || post.bodyMarkdown?.slice(0, 160),
    openGraph: {
      title: post.title,
      description:
        post.metadata?.description || post.bodyMarkdown?.slice(0, 160),
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
        post.metadata?.description || post.bodyMarkdown?.slice(0, 160),
      ...(post.metadata?.coverImage && {
        images: [post.metadata.coverImage],
      }),
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const { user } = await getSession();
  const canEdit = user && (user.role === "ADMIN" || user.id === post.author.id);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Navbar user={user} />

      <main className="flex-1 pt-24 pb-20 max-w-3xl mx-auto px-8 w-full">
        {/* Back Link (desktop only, dynamic based on referrer) */}
        <DesktopBackLink />

        {/* Article Header */}
        <header className="mb-12">
          {post.metadata?.category && (
            <span className="inline-block px-3 py-1 bg-primary-container/10 text-primary text-[10px] uppercase font-bold tracking-widest rounded-full mb-6">
              {post.metadata.category}
            </span>
          )}

          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tighter leading-tight mb-6 text-on-surface">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 pb-8 border-b border-outline-variant/15">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center overflow-hidden">
                {post.author.image ? (
                  <Image
                    className="w-full h-full object-cover"
                    src={post.author.image}
                    alt={post.author.name || ""}
                    width={48}
                    height={48}
                  />
                ) : (
                  <User className="w-5 h-5 text-on-surface-variant" />
                )}
              </div>
              <div>
                <p className="text-on-surface font-medium text-sm">
                  {post.author.name || "Anonymous"}
                </p>
                <div className="flex items-center space-x-2 text-xs text-on-surface-variant font-label">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>&middot;</span>
                  <span>{getReadTime(post.bodyMarkdown)}</span>
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="flex items-center gap-2 ml-auto">
              {canEdit && (
                <Link
                  href={`/dashboard/editor?slug=${post.slug}`}
                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-all"
                >
                  <FileEdit className="w-4 h-4" />
                </Link>
              )}
              <ShareButton title={post.title} slug={post.slug} />
            </div>
          </div>

          {/* Tags */}
          {post.metadata?.tags && post.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {post.metadata.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-surface-container text-xs text-on-surface-variant rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {post.metadata?.coverImage && (
          <div className="mb-12 rounded-xl overflow-hidden aspect-video bg-surface-container">
            <img
              src={post.metadata.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <article className="prose prose-invert prose-lg max-w-none prose-headings:font-headline prose-headings:font-semibold prose-headings:tracking-tight prose-p:font-body prose-p:text-on-surface-variant prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-on-surface prose-code:text-primary prose-code:bg-surface-container prose-code:px-2 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surface-container-low prose-pre:border prose-pre:border-outline-variant/20 prose-blockquote:border-l-primary-container prose-blockquote:bg-surface-container/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r prose-li:text-on-surface-variant prose-img:rounded-xl">
          <LatexRenderer html={post.bodyHtml} />
        </article>

        <RelatedPostsClient slug={slug} />
      </main>

      <Footer />
    </div>
  );
}
