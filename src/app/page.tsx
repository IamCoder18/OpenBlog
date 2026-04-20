import LoadMorePosts from "@/components/LoadMorePosts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { stripMarkdown } from "@/lib/strip-markdown";
import { getSession } from "@/lib/session";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Metadata {
  readTime?: number;
  category?: string;
  coverImage?: string;
  tags?: string[];
}

interface Post {
  id: string;
  title: string;
  slug: string;
  bodyMarkdown: string;
  bodyHtml: string;
  publishedAt: string | null;
  author: Author;
  metadata: Metadata | null;
}

interface PostsResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}

async function getPosts() {
  try {
    const res = await fetch(
      `${process.env.BASE_URL || "http://localhost:3001"}/api/posts?limit=10`,
      { cache: "no-store" }
    );
    if (!res.ok) return { posts: [], total: 0 };
    return (await res.json()) as PostsResponse;
  } catch {
    return { posts: [], total: 0 };
  }
}

export default async function Home() {
  const { posts } = await getPosts();
  const featuredPost = posts[0];
  const { user } = await getSession();
  const isAdmin = user?.role === "ADMIN" || user?.role === "AUTHOR";

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <Navbar activeLink="feed" />

      <main className="flex-1 pt-24 pb-24 max-w-7xl mx-auto px-8 w-full">
        {/* Hero Featured Section - Editorial Asymmetry */}
        {featuredPost && (
          <header
            className={`relative mb-24 flex flex-col ${featuredPost.metadata?.coverImage ? "md:flex-row items-center" : "items-start"} gap-12`}
          >
            <div
              className={`${featuredPost.metadata?.coverImage ? "w-full md:w-3/5" : ""} z-10 animate-fade-in-up`}
            >
              <div className="mb-4 inline-flex items-center space-x-2 text-primary font-label text-xs uppercase tracking-widest">
                <span className="w-8 h-[1px] bg-primary"></span>
                <span>Featured Post</span>
              </div>
              <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-6 text-on-surface">
                {featuredPost.title}
              </h1>
              <p className="text-on-surface-variant text-lg max-w-xl mb-8 leading-relaxed line-clamp-3">
                {stripMarkdown(featuredPost.bodyMarkdown, 200)}
              </p>
              <a
                href={`/blog/${featuredPost.slug}`}
                className="editorial-gradient text-on-primary px-8 py-4 rounded-lg font-label font-semibold inline-flex items-center group transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 animate-glow-pulse"
              >
                Read the Full Story
                <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </a>
            </div>
            {featuredPost.metadata?.coverImage && (
              <div className="w-full md:w-2/5 aspect-[4/5] relative animate-fade-in-up delay-200">
                <div className="absolute inset-0 theme-success-soft rounded-xl transform translate-x-4 translate-y-4 animate-float"></div>
                <div className="w-full h-full bg-surface-container rounded-xl shadow-2xl relative z-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={featuredPost.metadata.coverImage}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </header>
        )}

        {/* Dynamic Feed Section */}
        <LoadMorePosts initialPosts={posts} />
      </main>

      <Footer />
      <MobileBottomNav
        activeTab="feed"
        isAdmin={isAdmin}
        isAuthenticated={!!user}
      />
    </div>
  );
}
