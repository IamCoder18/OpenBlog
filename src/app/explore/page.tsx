import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import QueryToast from "@/components/QueryToast";
import ExploreClient from "./ExploreClient";
import { getSession } from "@/lib/session";

interface PostsResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
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

async function getInitialPosts() {
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

export default async function ExplorePage() {
  const { posts, total } = await getInitialPosts();
  const { user } = await getSession();
  const isAdmin = user?.role === "ADMIN" || user?.role === "AUTHOR";

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <QueryToast />
      <Navbar activeLink="explore" user={user} />

      <main className="flex-1 pt-24 pb-24 max-w-7xl mx-auto px-8 w-full">
        <header className="mb-16 text-center">
          <span className="text-primary font-label text-xs tracking-widest uppercase">
            Discover
          </span>
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tighter text-on-surface mt-4 mb-4">
            Explore stories
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
            Browse through our curated collection of thought-provoking articles,
            essays, and insights from authors around the world.
          </p>
        </header>

        <ExploreClient initialPosts={posts} initialTotal={total} />
      </main>

      <Footer />
      <MobileBottomNav
        activeTab="explore"
        isAdmin={isAdmin}
        isAuthenticated={!!user}
        userRole={user?.role}
      />
    </div>
  );
}
