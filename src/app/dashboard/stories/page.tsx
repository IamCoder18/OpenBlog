import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import DashboardStories from "@/components/dashboard/DashboardStories";
import Footer from "@/components/Footer";

export function generateMetadata() {
  return {
    title: `Stories | ${config.BLOG_NAME}`,
    description: "Manage your blog posts and content.",
  };
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { user } = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "AUTHOR")) {
    return null;
  }

  const params = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const isPersonal = isAdmin
    ? (params.mode ?? "personal") === "personal"
    : true;
  const scope = isPersonal ? "personal" : "site";

  // Fetch stats based on scope
  const wherePosts = isPersonal ? { authorId: user.id } : {};
  const [total, publishedCount, draftCount] = await Promise.all([
    prisma.post.count({ where: wherePosts }),
    prisma.post.count({
      where: { ...wherePosts, visibility: "PUBLIC" },
    }),
    prisma.post.count({
      where: { ...wherePosts, visibility: "DRAFT" },
    }),
  ]);

  return (
    <div className="pt-20 lg:pt-8 px-4 sm:px-6 lg:px-12 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-primary font-label text-[10px] tracking-[0.2em] uppercase">
              {isPersonal ? "Your Workspace" : "Admin Mode"}
            </span>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mt-2">
              {isPersonal ? "Your Stories" : "All Stories"}
            </h1>
            <p className="text-on-surface-variant text-sm mt-2">
              {isPersonal
                ? "Refine, schedule, and curate your content."
                : "Manage all content across the platform."}
            </p>
          </div>
          <Link
            href="/dashboard/editor"
            className="editorial-gradient text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Post
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-8">
          <div className="bg-surface-container-low rounded-xl p-3 sm:p-4">
            <div className="text-[9px] sm:text-[10px] text-on-surface-variant font-label uppercase tracking-wider mb-1">
              Total
            </div>
            <div className="text-xl sm:text-2xl font-headline font-bold text-on-surface">
              {total.toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 sm:p-4">
            <div className="text-[9px] sm:text-[10px] text-on-surface-variant font-label uppercase tracking-wider mb-1">
              Published
            </div>
            <div className="text-xl sm:text-2xl font-headline font-bold text-emerald-400">
              {publishedCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 sm:p-4">
            <div className="text-[9px] sm:text-[10px] text-on-surface-variant font-label uppercase tracking-wider mb-1">
              Drafts
            </div>
            <div className="text-xl sm:text-2xl font-headline font-bold text-on-surface-variant">
              {draftCount.toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      <DashboardStories scope={scope} />

      <Footer className="mt-16" />
    </div>
  );
}
