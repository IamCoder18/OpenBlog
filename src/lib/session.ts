import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function getSession(): Promise<{
  user: SessionUser | null;
  session: { id: string } | null;
}> {
  try {
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session?.user) {
      return { user: null, session: null };
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: profile?.role || "AGENT",
      },
      session: { id: session.session.id },
    };
  } catch {
    return { user: null, session: null };
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const { user } = await getSession();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireAuthOrAbove(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN" && user.role !== "AUTHOR") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
