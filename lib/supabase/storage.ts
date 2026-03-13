/**
 * Resolves an attachment URL for rendering.
 *
 * If the URL uses the `supabase:attachments/` scheme (private bucket),
 * it is rewritten to the authenticated serve endpoint which generates
 * a short-lived signed URL. Otherwise the URL is returned unchanged
 * for backwards compatibility with existing public URLs.
 */
export function resolveAttachmentUrl(url: string): string {
  const SUPABASE_PREFIX = "supabase:attachments/";

  if (url.startsWith(SUPABASE_PREFIX)) {
    const storagePath = url.slice(SUPABASE_PREFIX.length);
    return `/api/files/serve?path=${encodeURIComponent(storagePath)}`;
  }

  return url;
}

