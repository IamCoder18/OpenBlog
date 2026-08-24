import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import QueryToast from "@/components/QueryToast";
import ExploreClient from "./ExploreClient";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { postInclude } from "@/lib/posts";

async function getInitialPosts() {
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { visibility: "PUBLIC" },
      include: postInclude,
      orderBy: [
        { isPinned: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
    }),
    prisma.post.count({ where: { visibility: "PUBLIC" } }),
  ]);
  return {
    posts: posts.map(post => ({
      ...post,
      publishedAt: post.publishedAt?.toISOString() ?? null,
    })),
    total,
  };
}

export default async function ExplorePage() {
  const { posts, total } = await getInitialPosts();
  const { user } = await getSession();
  const canAccessDashboard = user?.role === "ADMIN" || user?.role === "AUTHOR";

  return (
    <div className="min-h-screen flex flex-col text-on-surface">
      <QueryToast />
      <Navbar activeLink="explore" user={user} />

      <main
        id="main-content"
        className="site-container flex-1 pb-28 pt-28 md:pt-32"
      >
        <header className="publication-reveal mb-10 border-b border-outline-variant pb-8 sm:pb-10">
          <h1 className="font-headline text-4xl font-extrabold tracking-[-0.055em] text-on-surface sm:text-6xl">
            All stories
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-on-surface-variant">
            Search or browse every public article in this publication.
          </p>
        </header>

        <ExploreClient initialPosts={posts} initialTotal={total} />
      </main>

      <Footer />
      <MobileBottomNav
        activeTab="explore"
        canAccessDashboard={canAccessDashboard}
        userRole={user?.role}
      />
    </div>
  );
}
