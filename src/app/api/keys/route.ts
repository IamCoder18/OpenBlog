import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { apiHandler } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id as string },
    select: {
      id: true,
      name: true,
      key: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
});

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

  const { name, expiresInDays } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Name must be less than 100 characters" },
      { status: 400 }
    );
  }

  const keyValue = `ob_${randomBytes(32).toString("hex")}`;

  let expiresAt: Date | undefined;
  if (typeof expiresInDays === "number" && expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const apiKey = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      key: keyValue,
      userId: session.user.id as string,
      ...(expiresAt && { expiresAt }),
    },
    select: {
      id: true,
      name: true,
      key: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json(apiKey, { status: 201 });
});
