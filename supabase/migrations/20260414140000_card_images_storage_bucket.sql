-- Public bucket for AI-generated card cover images (store HTTPS URLs in `cards.image_url` instead of huge data: URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-images',
  'card-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone can read cover images via public URL (paths are unguessable UUIDs)
CREATE POLICY "card_images_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'card-images');
