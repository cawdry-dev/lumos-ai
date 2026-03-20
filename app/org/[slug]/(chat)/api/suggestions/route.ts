import { auth } from "@/lib/supabase/auth";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter documentId is required."
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:suggestions").toResponse();
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== session.user.id) {
    return new ChatbotError("forbidden:api").toResponse();
  }

  return Response.json(suggestions, { status: 200 });
}
