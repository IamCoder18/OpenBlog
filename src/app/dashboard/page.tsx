import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import ViewsChart from "@/components/dashboard/ViewsChart";
import Footer from "@/components/Footer";

export function generateMetadata() {
  return {
    title: `Analytics | ${config.BLOG_NAME}`,
    description: "Editorial insights and analytics.",
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { user } = await getSession();
  if (!user || (user.role !== "ADMIN" && user.role !== "AUTHOR")) {
    redirect("/explore?error=dashboard_unauthorized");
  }

  const params = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const isPersonal = isAdmin
    ? (params.mode ?? "personal") === "personal"
    : true;

  // Fetch data based on scope
  const wherePosts = isPersonal ? { authorId: user.id } : {};
  const wherePublished = {
    ...wherePosts,
    visibility: "PUBLIC" as const,
  };
  const whereDrafts = {
    ...wherePosts,
    visibility: "DRAFT" as const,
  };

  const [totalPosts, publishedPosts, draftPosts, recentPosts, recentPublished] =
    await Promise.all([
      prisma.post.count({ where: wherePosts }),
      prisma.post.count({ where: wherePublished }),
      prisma.post.count({ where: whereDrafts }),
      prisma.post.findMany({
        take: 5,
        orderBy: { publishedAt: "desc" },
        where: isPersonal ? { authorId: user.id } : {},
        include: {
          author: { select: { name: true } },
          metadata: { select: { tags: true } },
        },
      }),
      prisma.post.count({
        where: {
          ...wherePublished,
          publishedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

  // Get personal view count
  let totalViews = 0;
  if (isPersonal) {
    const userPostIds = (
      await prisma.post.findMany({
        where: { authorId: user.id },
        select: { id: true },
      })
    ).map(p => p.id);

    if (userPostIds.length > 0) {
      totalViews = await prisma.pageView.count({
        where: { postId: { in: userPostIds } },
      });
    }
  } else {
    totalViews = await prisma.pageView.count();
  }

  const scopeLabel = isPersonal ? "Your" : "Site-wide";

  return (
    <div className="pt-20 lg:pt-8 px-4 sm:px-6 lg:px-12 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <span className="text-primary font-label text-[10px] tracking-[0.2em] uppercase">
          {isPersonal ? "Your Workspace" : "Admin Mode"}
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mt-2">
          {isPersonal
            ? `Welcome back, ${user.name?.split(" ")[0] || "there"}`
            : "Site Analytics"}
        </h1>
        <p className="text-on-surface-variant text-sm mt-2 max-w-lg">
          {isPersonal
            ? "Here's how your stories are performing."
            : "Overview of all content and traffic on the platform."}
        </p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* Stories */}
        <div className="bg-surface-container-low rounded-2xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary text-lg">
                article
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider font-label">
              Stories
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-on-surface">
            {totalPosts.toLocaleString()}
          </div>
          {recentPublished > 0 && (
            <span className="text-[10px] text-primary mt-1 inline-block font-medium">
              +{recentPublished} this month
            </span>
          )}
        </div>

        {/* Published */}
        <div className="bg-surface-container-low rounded-2xl p-5 animate-fade-in-up delay-75">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <span className="material-symbols-outlined text-emerald-400 text-lg">
                visibility
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider font-label">
              Published
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-on-surface">
            {publishedPosts.toLocaleString()}
          </div>
        </div>

        {/* Drafts */}
        <div className="bg-surface-container-low rounded-2xl p-5 animate-fade-in-up delay-100">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 bg-tertiary/10 rounded-lg">
              <span className="material-symbols-outlined text-tertiary text-lg">
                edit_note
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider font-label">
              Drafts
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-on-surface">
            {draftPosts.toLocaleString()}
          </div>
        </div>

        {/* Total Views */}
        <div className="bg-surface-container-low rounded-2xl p-5 animate-fade-in-up delay-150">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <span className="material-symbols-outlined text-violet-400 text-lg">
                trending_up
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider font-label">
              {scopeLabel} Views
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-on-surface">
            {totalViews.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-10">
        <ViewsChart />
      </div>

      {/* Recent Stories */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Recent stories
          </h3>
          <Link
            href="/dashboard/stories"
            className="text-primary text-xs font-semibold hover:underline flex items-center gap-1 font-label"
          >
            View all
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="space-y-2">
          {recentPosts.map(post => (
            <Link
              key={post.id}
              href={`/dashboard/editor?slug=${post.slug}`}
              className="flex items-center gap-4 p-4 bg-surface-container-low hover:bg-surface-container rounded-xl transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex-shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg text-outline-variant group-hover:text-primary transition-colors">
                  article
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-on-surface truncate">
                  {post.title}
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  {post.publishedAt
                    ? `Published ${new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "Draft"}
                  {post.author.name && !isPersonal
                    ? ` by ${post.author.name}`
                    : ""}
                </div>
              </div>
              {post.metadata?.tags?.[0] && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-md uppercase tracking-wider hidden sm:block">
                  {post.metadata.tags[0]}
                </span>
              )}
              <span className="material-symbols-outlined text-sm text-on-surface-variant group-hover:text-primary transition-colors">
                chevron_right
              </span>
            </Link>
          ))}
          {recentPosts.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant text-sm">
              No stories yet.
              <Link
                href="/dashboard/editor"
                className="block text-primary text-xs font-semibold mt-2 hover:underline"
              >
                Create your first story
              </Link>
            </div>
          )}
        </div>
      </section>

      <Footer className="mt-16" />
    </div>
  );
}
