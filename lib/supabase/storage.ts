const SUPABASE_PREFIX = "supabase:attachments/";

/**
 * Resolves an attachment URL for rendering in the browser.
 *
 * If the URL uses the `supabase:attachments/` scheme (private bucket),
 * it is rewritten to the authenticated serve endpoint (org-scoped via
 * `buildPath`) which generates a short-lived signed URL. Otherwise the
 * URL is returned unchanged for backwards compatibility.
 */
export function resolveAttachmentUrl(
  url: string,
  buildPath: (p: string) => string = (p) => p,
): string {
  if (url.startsWith(SUPABASE_PREFIX)) {
    const storagePath = url.slice(SUPABASE_PREFIX.length);
    return buildPath(
      `/api/files/serve?path=${encodeURIComponent(storagePath)}`,
    );
  }

  return url;
}

