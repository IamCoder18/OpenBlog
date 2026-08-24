ALTER TABLE "Post"
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Post_visibility_isPinned_publishedAt_idx"
  ON "Post"("visibility", "isPinned", "publishedAt");

CREATE INDEX "Post_visibility_isFeatured_publishedAt_idx"
  ON "Post"("visibility", "isFeatured", "publishedAt");
