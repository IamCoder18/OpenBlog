-- Existing plaintext keys cannot be safely migrated. Revoke them and require rotation.
ALTER TABLE "ApiKey"
  ADD COLUMN "prefix" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "lastUsedAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY['posts:read', 'posts:write']::TEXT[];

UPDATE "ApiKey"
SET "prefix" = LEFT("key", 11),
    "key" = 'revoked_' || "id",
    "revokedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Post"
  ADD COLUMN "scheduledAt" TIMESTAMP(3);

ALTER TABLE "PostMetadata"
  ADD COLUMN "coverImageAlt" TEXT;

CREATE TABLE "PostRedirect" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostRedirect_slug_key" ON "PostRedirect"("slug");
CREATE INDEX "PostRedirect_postId_idx" ON "PostRedirect"("postId");
ALTER TABLE "PostRedirect" ADD CONSTRAINT "PostRedirect_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
