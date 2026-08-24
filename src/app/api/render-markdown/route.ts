import { NextRequest, NextResponse } from "next/server";
import { renderMarkdown } from "@/lib/markdown";
import { apiHandler } from "@/lib/api-error";
import { getRequestViewer } from "@/lib/request-viewer";

export const dynamic = "force-dynamic";

export const POST = apiHandler(async function POST(req: NextRequest) {
  const headersList = req.headers;
  const viewer = await getRequestViewer(headersList, "posts:read");
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (viewer.role === "GUEST") {
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
