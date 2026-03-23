import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { headers } from "next/headers";
import { apiHandler } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function POST(req: NextRequest) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id as string },
  });

  if (!userProfile || userProfile.role === "GUEST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { markdown } = body;

  if (!markdown || typeof markdown !== "string") {
    return NextResponse.json(
      { error: "markdown is required and must be a string" },
      { status: 400 }
    );
  }

  const { html } = await renderMarkdown(markdown);

  return NextResponse.json({ html });
});
