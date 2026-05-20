-- Security Advisor (external):
-- 0025 public_bucket_allows_listing — broad SELECT on storage.objects enables listing
--   the whole bucket via the Data API. Public bucket URLs (/object/public/...) do not
--   require this policy (see Supabase linter remediation).
DROP POLICY IF EXISTS "card_images_public_select" ON storage.objects;

-- 0028 / 0029 SECURITY DEFINER RPC callable by anon or authenticated.
-- Only the Next.js API uses this with service_role (see contribute route).
REVOKE ALL ON FUNCTION public.increment_extra_pages(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_extra_pages(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_extra_pages(text) TO service_role;
