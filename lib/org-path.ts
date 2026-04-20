/**
 * Build an org-scoped path. Pure function — safe to use in both server
 * and client components.
 *
 * @example orgPath("acme", "/chat/123") → "/org/acme/chat/123"
 */
export function orgPath(slug: string, path: string): string {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `/org/${encodeURIComponent(slug)}${normalisedPath}`;
}
