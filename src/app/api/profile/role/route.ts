import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { apiHandler } from "@/lib/api-error";

const ALLOWED_ROLES = ["AGENT", "AUTHOR"] as const;

export const POST = apiHandler(async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role } = body;

  if (!role || typeof role !== "string") {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json(
      { error: `Role must be one of: ${ALLOWED_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  const profile = await prisma.userProfile.update({
    where: { userId: session.user.id as string },
    data: { role: role as (typeof ALLOWED_ROLES)[number] },
  });

  return NextResponse.json({ success: true, role: profile.role });
});
