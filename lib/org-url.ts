"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";

/**
 * Build an org-scoped path.
 *
 * @example orgPath("acme", "/chat/123") → "/org/acme/chat/123"
 */
export function orgPath(slug: string, path: string): string {
  // Ensure path starts with "/"
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return `/org/${encodeURIComponent(slug)}${normalisedPath}`;
}

/**
 * React hook — reads the current org slug from the Next.js route params.
 * Returns `null` when rendered outside an org-scoped route (e.g. `/login`,
 * `/mfa/enrol`, `/admin`).
 */
export function useOrgSlug(): string | null {
  const params = useParams<{ slug: string }>();
  return params?.slug ?? null;
}

/**
 * React hook — returns a helper function that builds org-prefixed paths
 * using the current route's slug.
 *
 * When no org slug is available the returned function passes the path
 * through unchanged.
 *
 * @example
 * const buildPath = useOrgPath();
 * buildPath("/chat/123") → "/org/acme/chat/123"  // inside org route
 * buildPath("/chat/123") → "/chat/123"            // outside org route
 */
export function useOrgPath(): (path: string) => string {
  const slug = useOrgSlug();
  return useCallback(
    (path: string) => (slug ? orgPath(slug, path) : path),
    [slug],
  );
}

