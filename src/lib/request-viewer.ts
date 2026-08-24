import "server-only";

import { auth } from "@/auth";
import { authenticateApiKey, type ApiKeyScope } from "@/lib/api-keys";
import { prisma } from "@/lib/db";
import type { PostViewer } from "@/lib/post-policy";

export async function getRequestViewer(
  requestHeaders: Headers,
  apiKeyScope: ApiKeyScope = "posts:read"
): Promise<PostViewer | null> {
  const authorization = requestHeaders.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authenticateApiKey(authorization, apiKeyScope);
  }

  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return null;
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  return { id: session.user.id, role: profile?.role ?? "AGENT" };
}
