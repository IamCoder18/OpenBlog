import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canManagePost,
  canMutatePosts,
  canReadPost,
  collectionAccessWhere,
  isVisibility,
  type PostViewer,
  type PostVisibility,
} from "@/lib/post-policy";

const { apiKeyFindUnique, apiKeyUpdate } = vi.hoisted(() => ({
  apiKeyFindUnique: vi.fn(),
  apiKeyUpdate: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    apiKey: { findUnique: apiKeyFindUnique, update: apiKeyUpdate },
  },
}));

import {
  authenticateApiKey,
  createApiKeySecret,
  hashApiKey,
} from "@/lib/api-keys";

const viewers: Record<string, PostViewer | null> = {
  anonymous: null,
  admin: { id: "admin", role: "ADMIN" },
  owner: { id: "owner", role: "AUTHOR" },
  author: { id: "other-author", role: "AUTHOR" },
  agent: { id: "agent", role: "AGENT" },
  guest: { id: "guest", role: "GUEST" },
};

describe("post visibility policy", () => {
  it.each(["PUBLIC", "UNLISTED", "PRIVATE", "DRAFT"])(
    "accepts the %s visibility",
    visibility => expect(isVisibility(visibility)).toBe(true)
  );

  it.each(["", "PUBLISHED", null, undefined, 1])(
    "rejects the invalid visibility %s",
    visibility => expect(isVisibility(visibility)).toBe(false)
  );

  it.each([
    ["PUBLIC", true, true, true, true, true, true],
    ["UNLISTED", true, true, true, true, true, true],
    ["PRIVATE", false, true, true, false, false, false],
    ["DRAFT", false, true, true, false, false, false],
  ] as const)(
    "%s direct reads are correctly scoped",
    (visibility, anonymous, admin, owner, author, agent, guest) => {
      const post = {
        authorId: "owner",
        visibility: visibility as PostVisibility,
      };
      expect(canReadPost(viewers.anonymous, post)).toBe(anonymous);
      expect(canReadPost(viewers.admin, post)).toBe(admin);
      expect(canReadPost(viewers.owner, post)).toBe(owner);
      expect(canReadPost(viewers.author, post)).toBe(author);
      expect(canReadPost(viewers.agent, post)).toBe(agent);
      expect(canReadPost(viewers.guest, post)).toBe(guest);
    }
  );

  it("keeps unlisted content out of public collections", () => {
    expect(collectionAccessWhere(null)).toEqual({ visibility: "PUBLIC" });
    expect(collectionAccessWhere(viewers.owner)).toEqual({
      OR: [{ visibility: "PUBLIC" }, { authorId: "owner" }],
    });
    expect(collectionAccessWhere(viewers.admin)).toEqual({});
  });

  it("allows mutations only for authors and admins", () => {
    expect(canMutatePosts(viewers.admin)).toBe(true);
    expect(canMutatePosts(viewers.owner)).toBe(true);
    expect(canMutatePosts(viewers.agent)).toBe(false);
    expect(canMutatePosts(viewers.guest)).toBe(false);
    expect(canMutatePosts(null)).toBe(false);
  });

  it("allows only an owning author or admin to manage a post", () => {
    expect(canManagePost(viewers.admin, "owner")).toBe(true);
    expect(canManagePost(viewers.owner, "owner")).toBe(true);
    expect(canManagePost(viewers.author, "owner")).toBe(false);
    expect(canManagePost(viewers.agent, "agent")).toBe(false);
  });
});

describe("API key security", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a one-time secret and stores only its digest", () => {
    const first = createApiKeySecret();
    const second = createApiKeySecret();
    expect(first.secret).toMatch(/^ob_[A-Za-z0-9_-]{43}$/);
    expect(first.digest).toBe(hashApiKey(first.secret));
    expect(first.digest).not.toContain(first.secret);
    expect(first.prefix).toBe(first.secret.slice(0, 11));
    expect(second.secret).not.toBe(first.secret);
  });

  it("rejects expired, revoked, and under-scoped credentials", async () => {
    for (const key of [
      { revokedAt: new Date(), expiresAt: null, scopes: ["posts:read"] },
      { revokedAt: null, expiresAt: new Date(0), scopes: ["posts:read"] },
      { revokedAt: null, expiresAt: null, scopes: ["posts:write"] },
    ]) {
      apiKeyFindUnique.mockResolvedValueOnce({
        id: "key",
        ...key,
        user: {
          id: "owner",
          name: "Owner",
          image: null,
          profile: { role: "AUTHOR" },
        },
      });
      expect(
        await authenticateApiKey("Bearer ob_secret", "posts:read")
      ).toBeNull();
    }
    expect(apiKeyUpdate).not.toHaveBeenCalled();
  });

  it("updates last-used metadata only after successful authentication", async () => {
    apiKeyFindUnique.mockResolvedValue({
      id: "key",
      revokedAt: null,
      expiresAt: null,
      scopes: ["posts:read"],
      user: {
        id: "owner",
        name: "Owner",
        image: null,
        profile: { role: "AUTHOR" },
      },
    });
    apiKeyUpdate.mockResolvedValue({});
    await expect(
      authenticateApiKey("Bearer ob_secret", "posts:read")
    ).resolves.toMatchObject({
      id: "owner",
      role: "AUTHOR",
    });
    expect(apiKeyUpdate).toHaveBeenCalledWith({
      where: { id: "key" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });
});
