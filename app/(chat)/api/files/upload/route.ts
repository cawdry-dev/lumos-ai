import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { extractText, isSupportedMimeType } from "@/lib/rag/parse";

export const dynamic = "force-dynamic";

// Allow longer execution for large file uploads + text extraction.
export const maxDuration = 60;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "text/plain",
  "text/markdown",
  "application/pdf",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size should be less than 100MB",
    })
    .refine((file) => ALLOWED_MIME_TYPES.includes(file.type), {
      message: "File type should be JPEG, PNG, TXT, Markdown, or PDF",
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const supabase = await createClient();

      // Generate a unique path to avoid collisions
      const storagePath = `${session.user.id}/${Date.now()}-${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: "Upload failed" },
          { status: 500 },
        );
      }

      // For document types, extract text so the AI can read the content.
      let extractedText: string | undefined;
      if (isSupportedMimeType(file.type)) {
        try {
          extractedText = await extractText(
            Buffer.from(fileBuffer),
            file.type,
          );
        } catch (err) {
          console.error("Text extraction failed:", err);
          // Non-fatal — the file is still uploaded, just without extracted text.
        }
      }

      // Return the storage path with a scheme prefix so it can be
      // resolved to a signed URL at render time (private bucket).
      return NextResponse.json({
        url: `supabase:attachments/${storagePath}`,
        pathname: storagePath,
        contentType: file.type,
        ...(extractedText !== undefined && { extractedText }),
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
