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
 * Must be used inside a route that contains `[slug]` (e.g. `/org/[slug]/…`).
 */
export function useOrgSlug(): string {
  const params = useParams<{ slug: string }>();
  if (!params?.slug) {
    throw new Error(
      "useOrgSlug() must be used inside a route with a [slug] parameter."
    );
  }
  return params.slug;
}

/**
 * React hook — returns a helper function that builds org-prefixed paths
 * using the current route's slug.
 *
 * @example
 * const buildPath = useOrgPath();
 * buildPath("/chat/123") → "/org/acme/chat/123"
 */
export function useOrgPath(): (path: string) => string {
  const slug = useOrgSlug();
  return useCallback((path: string) => orgPath(slug, path), [slug]);
}

