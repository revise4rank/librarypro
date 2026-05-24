-- Migration 0024: Add likes_count denormalized column to student_feed_posts
-- Note: feed_likes table already exists from migration 0011.

ALTER TABLE student_feed_posts ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

-- Backfill existing like counts
UPDATE student_feed_posts sfp
SET likes_count = (
  SELECT COUNT(*) FROM feed_likes fl WHERE fl.feed_post_id = sfp.id
);
