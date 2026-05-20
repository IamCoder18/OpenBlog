import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiHandler } from "@/lib/api-error";

// Note: This endpoint is only used for E2E tests
// In production, this should be properly secured
export const POST = apiHandler(async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await req.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Missing email or role" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.userProfile.update({
    where: { userId: user.id },
    data: { role },
  });

  return NextResponse.json({ success: true, role: updated.role });
});
