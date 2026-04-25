"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { stripMarkdown } from "@/lib/strip-markdown";
import { Link2 } from "lucide-react";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface MetadataType {
  category?: string;
  readTime?: number;
  coverImage?: string;
  tags?: string[];
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  publishedAt: string | null;
  author: Author;
  metadata: MetadataType | null;
}

interface RelatedPostsClientProps {
  slug: string;
}

export default function RelatedPostsClient({ slug }: RelatedPostsClientProps) {
  const [posts, setPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchRelatedPosts() {
      try {
        const res = await fetch(`/api/posts/${slug}/related`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    void fetchRelatedPosts();
  }, [slug]);

  if (loading) {
    return (
      <section className="mt-20">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface mb-8">
          Related Stories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-surface-container-low rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-video bg-surface-container" />
              <div className="p-5">
                <div className="h-3 bg-surface-container rounded w-1/3 mb-3"></div>
                <div className="h-5 bg-surface-container rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-surface-container rounded w-full mb-2"></div>
                <div className="h-4 bg-surface-container rounded w-2/3"></div>
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/10">
                <div className="h-3 bg-surface-container rounded w-1/4"></div>
                <div className="h-3 bg-surface-container rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-20">
        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface mb-8">
          Related Stories
        </h2>
        <div className="bg-surface-container-low rounded-xl p-8 text-center">
          <Link2 className="w-8 h-8 text-outline-variant mb-3" />
          <p className="text-sm text-on-surface-variant">
            Related stories could not be loaded right now.
          </p>
        </div>
      </section>
    );
  }

  if (posts.length === 0) return null;

  return (
    <section className="mt-20">
      <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface mb-8">
        Related Stories
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.slice(0, 3).map(post => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group bg-surface-container-low hover:bg-surface-container rounded-xl overflow-hidden flex flex-col transition-all duration-300"
          >
            {post.metadata?.coverImage && (
              <div className="aspect-video bg-surface-container overflow-hidden">
                <img
                  src={post.metadata.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            )}
            <div className="p-5 flex-1 flex flex-col">
              {post.metadata?.category && (
                <span className="text-primary text-[10px] uppercase tracking-widest font-bold font-label">
                  {post.metadata.category}
                </span>
              )}
              <h3 className="font-headline text-base font-bold mt-2 mb-2 text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2 font-body flex-1">
                {stripMarkdown(post.bodyMarkdown, 100)}
              </p>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/10">
              <span className="text-xs text-on-surface-variant font-label">
                {post.author.name || "Anonymous"}
              </span>
              <span className="text-primary text-xs font-bold uppercase tracking-widest flex items-center font-label">
                Read
                <Link2 className="w-4 h-4 ml-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
