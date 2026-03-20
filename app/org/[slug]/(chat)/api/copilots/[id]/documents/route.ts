import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getCopilotById,
  getKnowledgeDocuments,
  createKnowledgeDocument,
} from "@/lib/db/queries";
import { ingestDocument } from "@/lib/rag/ingest";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/** Shared org admin guard — returns a Response if the user is not an org admin/owner. */
async function requireOrgAdmin(slug: string) {
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return {
      error: new ChatbotError("unauthorized:chat").toResponse(),
    };
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return {
      error: Response.json(
        { error: "Forbidden. Only admins can manage knowledge documents." },
        { status: 403 },
      ),
    };
  }

  return { session, orgId: session.org.id };
}

/**
 * GET /api/copilots/[id]/documents
 *
 * Lists all knowledge documents for a co-pilot.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  try {
    const copilotRow = await getCopilotById(id, guard.orgId);
    if (!copilotRow) {
      return Response.json({ error: "Co-pilot not found." }, { status: 404 });
    }

    const documents = await getKnowledgeDocuments(id, guard.orgId);
    return Response.json({ documents });
  } catch (error) {
    console.error("Failed to list knowledge documents:", error);
    return Response.json(
      { error: "Failed to list knowledge documents." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/copilots/[id]/documents
 *
 * Uploads a file to Supabase Storage and creates a knowledge document record.
 * Triggers the ingestion pipeline asynchronously.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  try {
    const copilotRow = await getCopilotById(id, guard.orgId);
    if (!copilotRow) {
      return Response.json({ error: "Co-pilot not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        {
          error:
            "Unsupported file type. Only .txt, .md, and .pdf files are allowed.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File exceeds the 10 MB size limit." },
        { status: 400 },
      );
    }

    // Upload to Supabase Storage (service role client bypasses RLS)
    const supabase = createServiceClient();
    const storagePath = `knowledge/${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error("Supabase Storage upload failed:", uploadError);
      return Response.json(
        { error: "Failed to upload file." },
        { status: 500 },
      );
    }

    // Create the database record
    const title = file.name.replace(/\.[^.]+$/, "");
    const doc = await createKnowledgeDocument({
      copilotId: id,
      title,
      fileName: file.name,
      mimeType: file.type,
      storagePath,
      uploadedBy: guard.session.user.id,
      orgId: guard.orgId,
    });

    // Trigger ingestion asynchronously (fire-and-forget).
    // We already have the file bytes in memory so convert to a Buffer.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    ingestDocument({
      documentId: doc.id,
      buffer,
      mimeType: file.type,
      orgId: guard.orgId,
    }).catch((err) => {
      console.error("Ingestion pipeline error for document", doc.id, err);
    });

    return Response.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload knowledge document:", error);
    return Response.json(
      { error: "Failed to upload knowledge document." },
      { status: 500 },
    );
  }
}

