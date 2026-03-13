import type { UIMessage } from "ai";

import { createClient } from "@/lib/supabase/server";

const SUPABASE_PREFIX = "supabase:attachments/";

/**
 * Resolves an attachment URL for rendering in the browser.
 *
 * If the URL uses the `supabase:attachments/` scheme (private bucket),
 * it is rewritten to the authenticated serve endpoint which generates
 * a short-lived signed URL. Otherwise the URL is returned unchanged
 * for backwards compatibility with existing public URLs.
 */
export function resolveAttachmentUrl(url: string): string {
  if (url.startsWith(SUPABASE_PREFIX)) {
    const storagePath = url.slice(SUPABASE_PREFIX.length);
    return `/api/files/serve?path=${encodeURIComponent(storagePath)}`;
  }

  return url;
}

/**
 * Resolves any `supabase:attachments/` file URLs in message parts to
 * signed HTTPS URLs that AI models can fetch directly.
 *
 * The client-side `resolveAttachmentUrl` rewrites to a local API route,
 * but AI models need a publicly accessible URL. This server-side variant
 * generates short-lived Supabase Storage signed URLs instead.
 */
export async function resolveImageUrlsForModel<
  T extends UIMessage,
>(messages: T[]): Promise<T[]> {
  // Collect all unique supabase:attachments/ URLs that need resolving
  const urlsToResolve = new Set<string>();

  for (const msg of messages) {
    for (const part of msg.parts) {
      if (
        part.type === "file" &&
        typeof (part as { url?: string }).url === "string" &&
        (part as { url: string }).url.startsWith(SUPABASE_PREFIX)
      ) {
        urlsToResolve.add((part as { url: string }).url);
      }
    }
  }

  if (urlsToResolve.size === 0) return messages;

  const supabase = await createClient();
  const urlMap = new Map<string, string>();

  for (const url of urlsToResolve) {
    const path = url.slice(SUPABASE_PREFIX.length);
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrl(path, 3600); // 1-hour expiry
    if (data?.signedUrl) {
      urlMap.set(url, data.signedUrl);
    }
  }

  // Return new messages with resolved URLs
  return messages.map((msg) => ({
    ...msg,
    parts: msg.parts.map((part) => {
      if (
        part.type === "file" &&
        typeof (part as { url?: string }).url === "string" &&
        urlMap.has((part as { url: string }).url)
      ) {
        return { ...part, url: urlMap.get((part as { url: string }).url)! };
      }
      return part;
    }),
  }));
}

