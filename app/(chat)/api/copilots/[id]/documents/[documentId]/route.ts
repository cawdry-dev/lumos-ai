import { type NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {

export const dynamic = "force-dynamic";
  getKnowledgeDocumentById,
  deleteKnowledgeDocument,
} from "@/lib/db/queries";

/** Shared admin guard — returns a Response if the user is not an admin. */
async function requireAdmin() {
  const session = await auth();

  if (!session) {
    return {
      error: Response.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  if (session.user.role !== "admin") {
    return {
      error: Response.json(
        { error: "Forbidden. Only admins can manage knowledge documents." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

/**
 * DELETE /api/copilots/[id]/documents/[documentId]
 *
 * Deletes a knowledge document, its chunks, and the file from storage.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const { id, documentId } = await params;

  try {
    const doc = await getKnowledgeDocumentById(documentId);

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
    await deleteKnowledgeDocument(documentId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete knowledge document:", error);
    return Response.json(
      { error: "Failed to delete knowledge document." },
      { status: 500 },
    );
  }
}

