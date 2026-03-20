import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getKnowledgeDocumentById,
  deleteKnowledgeDocument,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

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
 * DELETE /api/copilots/[id]/documents/[documentId]
 *
 * Deletes a knowledge document, its chunks, and the file from storage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; documentId: string }> },
) {
  const { slug, id, documentId } = await params;
  const guard = await requireOrgAdmin(slug);
  if ("error" in guard) return guard.error;

  try {
    const doc = await getKnowledgeDocumentById(documentId, guard.orgId);

    if (!doc || doc.copilotId !== id) {
      return Response.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    // Remove the file from Supabase Storage (service role client bypasses RLS)
    const supabase = createServiceClient();
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.storagePath]);

    if (storageError) {
      console.error("Failed to remove file from storage:", storageError);
      // Continue with DB deletion even if storage removal fails
    }

    // Delete the document record and its chunks from the database
    await deleteKnowledgeDocument(documentId, guard.orgId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete knowledge document:", error);
    return Response.json(
      { error: "Failed to delete knowledge document." },
      { status: 500 },
    );
  }
}

