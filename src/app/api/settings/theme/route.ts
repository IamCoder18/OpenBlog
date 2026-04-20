import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { apiHandler, ApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const VALID_THEMES = ["default", "ocean", "forest", "ember"] as const;
type ThemeId = (typeof VALID_THEMES)[number];

export const GET = apiHandler(async function GET() {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: "theme" },
  });

  const theme = setting?.value || "default";
  return NextResponse.json({ theme });
});

export const PUT = apiHandler(async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id as string },
  });

  if (!userProfile || userProfile.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { theme } = body;

  if (!theme || typeof theme !== "string") {
    throw new ApiError(400, "Theme is required");
  }

  if (!VALID_THEMES.includes(theme as ThemeId)) {
    throw new ApiError(
      400,
      `Invalid theme. Must be one of: ${VALID_THEMES.join(", ")}`
    );
  }

  await prisma.siteSettings.upsert({
    where: { key: "theme" },
    update: { value: theme },
    create: { key: "theme", value: theme },
  });

  return NextResponse.json({ theme });
});
