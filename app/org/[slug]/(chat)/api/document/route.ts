import { auth } from "@/lib/supabase/auth";
import type { ArtifactKind } from "@/components/artifact";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter id is missing"
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  const orgId = session.org.id;
  const documents = await getDocumentsById({ id, orgId });

  const [document] = documents;

  if (!document) {
    return new ChatbotError("not_found:document").toResponse();
  }

  if (document.userId !== session.user.id) {
    return new ChatbotError("forbidden:document").toResponse();
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("not_found:document").toResponse();
  }

  const orgId = session.org.id;

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  const documents = await getDocumentsById({ id, orgId });

  if (documents.length > 0) {
    const [doc] = documents;

    if (doc.userId !== session.user.id) {
      return new ChatbotError("forbidden:document").toResponse();
    }
  }

  const document = await saveDocument({
    id,
    content,
    title,
    kind,
    userId: session.user.id,
    orgId,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter id is required."
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter timestamp is required."
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:document").toResponse();
  }

  const orgId = session.org.id;
  const documents = await getDocumentsById({ id, orgId });

  const [document] = documents;

  if (document.userId !== session.user.id) {
    return new ChatbotError("forbidden:document").toResponse();
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
    orgId,
  });

  return Response.json(documentsDeleted, { status: 200 });
}
