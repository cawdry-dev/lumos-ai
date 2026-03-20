import type { NextRequest } from "next/server";
import { auth } from "@/lib/supabase/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatbotError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const orgId = session.org.id;

  const chats = await getChatsByUserId({
    id: session.user.id,
    limit,
    startingAfter,
    endingBefore,
    orgId,
  });

  return Response.json(chats);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const orgId = session.org.id;

  const result = await deleteAllChatsByUserId({ userId: session.user.id, orgId });

  return Response.json(result, { status: 200 });
}
