import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { apiHandler } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { path, referrer, postId } = body;

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }

  if (path.length > 2048) {
    return NextResponse.json({ error: "Path too long" }, { status: 400 });
  }

  if (!/^\/blog\/[a-z0-9-]+$/.test(path) || typeof postId !== "string") {
    return NextResponse.json(
      { error: "Only public article views are tracked" },
      { status: 400 }
    );
  }

  const trackedPost = await prisma.post.findFirst({
    where: {
      id: postId,
      slug: path.slice("/blog/".length),
      visibility: "PUBLIC",
    },
    select: { id: true },
  });
  if (!trackedPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const headersList = req.headers;
  const userAgent = headersList.get("user-agent") || undefined;
  const forwardedFor = headersList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  let safeReferrer: string | null = null;
  if (typeof referrer === "string" && referrer.length <= 2048) {
    try {
      const parsed = new URL(referrer);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        safeReferrer = parsed.toString();
      }
    } catch {
      safeReferrer = null;
    }
  }

  await prisma.pageView.create({
    data: {
      path,
      referrer: safeReferrer,
      userAgent: userAgent || null,
      ipHash,
      postId: postId || null,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
});

export const GET = apiHandler(async function GET(req: NextRequest) {
  // Auth required for analytics
  const headersList = req.headers;
  let currentUserId: string | null = null;
  let currentUserRole: string | null = null;

  try {
    const { auth: authInstance } = await import("@/auth");
    const session = await authInstance.api.getSession({ headers: headersList });
    if (session?.user) {
      currentUserId = session.user.id as string;
      const profile = await prisma.userProfile.findUnique({
        where: { userId: currentUserId },
        select: { role: true },
      });
      currentUserRole = profile?.role ?? null;
    }
  } catch {
    // Not authenticated
  }

  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const daysParam = searchParams.get("days");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const postId = searchParams.get("postId");
  const scope = searchParams.get("scope");
  const effectiveScope =
    currentUserRole === "ADMIN" && scope === "site" ? "site" : "personal";

  if (scope === "site" && currentUserRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let since: Date;
  let until: Date | null = null;

  if (fromParam && toParam) {
    since = new Date(fromParam);
    until = new Date(toParam);
    if (isNaN(since.getTime()) || isNaN(until.getTime())) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 }
      );
    }
  } else {
    const days = parseInt(daysParam || "30", 10);
    since = new Date();
    since.setDate(since.getDate() - Math.min(days, 365));
  }

  const where: Record<string, unknown> = {
    createdAt: until ? { gte: since, lte: until } : { gte: since },
  };

  // Personal scope: filter to only this user's posts
  let personalPostIds: string[] = [];
  if (effectiveScope === "personal") {
    personalPostIds = (
      await prisma.post.findMany({
        where: { authorId: currentUserId },
        select: { id: true },
      })
    ).map(p => p.id);

    if (postId && !personalPostIds.includes(postId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (postId) {
      where.postId = postId;
    } else if (personalPostIds.length > 0) {
      where.postId = { in: personalPostIds };
    } else {
      where.postId = "__none__";
    }
  } else if (postId) {
    const ownedPost = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (
      !ownedPost ||
      (currentUserRole !== "ADMIN" && ownedPost.authorId !== currentUserId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    where.postId = postId;
  }

  let viewsByDay: Array<{ date: string; views: number }> = [];

  try {
    const untilDate = until ?? new Date();
    if (postId) {
      viewsByDay = await prisma.$queryRaw`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC') as date, COUNT(*)::int as views
        FROM "PageView"
        WHERE "createdAt" >= ${since}
          AND "createdAt" <= ${untilDate}
          AND "postId" = ${postId}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `;
    } else if (effectiveScope === "personal" && personalPostIds.length > 0) {
      viewsByDay = await prisma.$queryRaw`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC') as date, COUNT(*)::int as views
        FROM "PageView"
        WHERE "createdAt" >= ${since}
          AND "createdAt" <= ${untilDate}
          AND "postId" = ANY(${personalPostIds}::text[])
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `;
    } else {
      viewsByDay = await prisma.$queryRaw`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC') as date, COUNT(*)::int as views
        FROM "PageView"
        WHERE "createdAt" >= ${since}
          AND "createdAt" <= ${untilDate}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY date ASC
      `;
    }
  } catch {
    viewsByDay = [];
  }

  const [totalViews, topPaths, topReferrers] = await Promise.all([
    prisma.pageView.count({ where }),
    prisma.pageView.groupBy({
      by: ["path"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.pageView.groupBy({
      by: ["referrer"],
      where: { ...where, referrer: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  const trafficSources = [
    {
      name: "Direct",
      count: topReferrers
        .filter(
          r =>
            !r.referrer || r.referrer === "" || r.referrer.includes("localhost")
        )
        .reduce((sum, r) => sum + r._count.id, 0),
    },
    ...topReferrers
      .filter(
        r =>
          r.referrer && r.referrer !== "" && !r.referrer.includes("localhost")
      )
      .map(r => ({
        name: new URL(r.referrer!).hostname,
        count: r._count.id,
      })),
  ].filter(s => s.count > 0);

  return NextResponse.json({
    scope: effectiveScope,
    totalViews,
    viewsByDay,
    topPaths: topPaths.map(p => ({
      path: p.path,
      views: p._count.id,
    })),
    trafficSources,
    period: {
      days: until
        ? Math.ceil((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24))
        : daysParam
          ? parseInt(daysParam, 10)
          : 30,
      from: since.toISOString(),
    },
  });
});
