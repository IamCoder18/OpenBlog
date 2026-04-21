-- CreateIndex
CREATE INDEX "Post_title_trgm_idx" ON "Post" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Post_slug_trgm_idx" ON "Post" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "PostMetadata_tags_gin_idx" ON "PostMetadata" USING GIN ("tags");
