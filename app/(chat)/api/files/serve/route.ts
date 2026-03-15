import { NextResponse } from "next/server";

import { auth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/** Buckets that the serve endpoint is allowed to create signed URLs for. */
const ALLOWED_BUCKETS = new Set(["attachments", "generated-images"]);

/**
 * GET /api/files/serve?path=<storagePath>
 *
 * Generates a short-lived signed URL for a private Supabase Storage
 * object and redirects the caller to it. The user must be authenticated.
 *
 * The `path` parameter can be either:
 * - A plain object path (legacy) — served from the "attachments" bucket
 * - A "bucket/object-path" string — served from the specified bucket
 *   (only buckets in ALLOWED_BUCKETS are accepted)
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get("path");

  if (!rawPath) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter" },
      { status: 400 },
    );
  }

  // Determine bucket and object path.
  // If the path starts with a known bucket name followed by "/", use that
  // bucket. Otherwise default to "attachments" for backwards compatibility.
  let bucket = "attachments";
  let objectPath = rawPath;

  for (const allowed of ALLOWED_BUCKETS) {
    if (rawPath.startsWith(`${allowed}/`)) {
      bucket = allowed;
      objectPath = rawPath.slice(allowed.length + 1);
      break;
    }
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL:", error);
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 },
      );
    }

    return NextResponse.redirect(data.signedUrl, 302);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 },
    );
  }
}

