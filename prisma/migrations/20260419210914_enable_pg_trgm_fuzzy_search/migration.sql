-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for trigram similarity search on Post scalar fields
-- These indexes support fuzzy matching for title and slug via similarity() and %% operator
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx" 
  ON "Post" USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Post_slug_trgm_idx" 
  ON "Post" USING GIN (slug gin_trgm_ops);

-- GIN index for tags array using default array_ops for exact containment matching
-- (tags typically require exact match; fuzzy tag search can be added separately if needed)
CREATE INDEX IF NOT EXISTS "PostMetadata_tags_gin_idx" 
  ON "PostMetadata" USING GIN (tags);
