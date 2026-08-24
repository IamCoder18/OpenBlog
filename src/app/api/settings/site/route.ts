import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiHandler } from "@/lib/api-error";
import { prisma } from "@/lib/db";
import {
  getSiteProfileWithEnv,
  type SiteProfileField,
} from "@/lib/site-settings";

const KEY = "site_profile";
const LOCKED_FIELDS: SiteProfileField[] = [
  "name",
  "description",
  "logoUrl",
  "contactEmail",
  "socialUrl",
];

function publicUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
export const GET = apiHandler(async function GET() {
  const { profile, overrides } = await getSiteProfileWithEnv();
  return NextResponse.json({ profile, overrides });
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
  const body = await req.json();
  const { overrides } = await getSiteProfileWithEnv();
  const attemptedLocked = LOCKED_FIELDS.filter(
    field => overrides[field] && body[field] !== undefined
  );
  if (attemptedLocked.length > 0)
    return NextResponse.json(
      {
        error: `These fields are locked by environment variables and cannot be changed: ${attemptedLocked.join(
          ", "
        )}.`,
      },
      { status: 400 }
    );
  const logoUrl = publicUrl(body.logoUrl);
  const socialUrl = publicUrl(body.socialUrl);
  if (logoUrl === null || socialUrl === null)
    return NextResponse.json(
      { error: "Logo and social links must use valid http or https URLs" },
      { status: 400 }
    );
  const profile = {
    name: typeof body.name === "string" ? body.name.trim().slice(0, 80) : "",
    description:
      typeof body.description === "string"
        ? body.description.trim().slice(0, 240)
        : "",
    logoUrl,
    contactEmail:
      typeof body.contactEmail === "string"
        ? body.contactEmail.trim().slice(0, 254)
        : "",
    socialUrl,
  };
  if (!profile.name || !profile.description)
    return NextResponse.json(
      { error: "Name and description are required" },
      { status: 400 }
    );
  if (
    profile.contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contactEmail)
  )
    return NextResponse.json(
      { error: "Contact email must be a valid email address" },
      { status: 400 }
    );
  await prisma.siteSettings.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(profile) },
    create: { key: KEY, value: JSON.stringify(profile) },
  });
  const { profile: savedProfile, overrides: savedOverrides } =
    await getSiteProfileWithEnv();
  return NextResponse.json({
    profile: savedProfile,
    overrides: savedOverrides,
  });
});
