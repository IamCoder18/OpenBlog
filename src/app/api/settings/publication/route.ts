import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiHandler } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  normalizePublicationSettings,
  publicationSettingsErrors,
} from "@/lib/publication-settings.shared";
import { getPublicationSettings } from "@/lib/site-settings";

const KEY = "publication_experience";

export const GET = apiHandler(async function GET() {
  return NextResponse.json(await getPublicationSettings());
});

export const PUT = apiHandler(async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  if (actor?.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const settings = normalizePublicationSettings(input);
  const errors = publicationSettingsErrors(settings);
  if (errors.length)
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  await prisma.siteSettings.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: KEY, value: JSON.stringify(settings) },
  });
  return NextResponse.json(settings);
});
