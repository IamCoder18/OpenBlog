import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const API_KEY_SCOPES = ["posts:read", "posts:write"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createApiKeySecret(): {
  secret: string;
  digest: string;
  prefix: string;
} {
  const secret = `ob_${randomBytes(32).toString("base64url")}`;
  return {
    secret,
    digest: hashApiKey(secret),
    prefix: secret.slice(0, 11),
  };
}

export async function authenticateApiKey(
  authorization: string | null,
  requiredScope: ApiKeyScope
) {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashApiKey(token) },
    include: {
      user: {
        include: { profile: true },
      },
    },
  });

  if (
    !apiKey ||
    apiKey.revokedAt ||
    (apiKey.expiresAt && apiKey.expiresAt <= new Date()) ||
    !apiKey.scopes.includes(requiredScope)
  ) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiKey.user.id,
    name: apiKey.user.name,
    image: apiKey.user.image,
    role: apiKey.user.profile?.role ?? "AGENT",
    scopes: apiKey.scopes,
  };
}
