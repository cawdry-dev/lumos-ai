import { NextResponse } from "next/server";

import { auth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/files/serve?path=<storagePath>
 *
 * Generates a short-lived signed URL for a private Supabase Storage
 * object and redirects the caller to it. The user must be authenticated.
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json(
      { error: "Missing 'path' query parameter" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(path, 3600); // 1 hour expiry

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

