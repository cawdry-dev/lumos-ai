import { auth } from "@/lib/supabase/auth";
import { getChatById, getVotesByChatId, voteMessage } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatbotError(
      "bad_request:api",
      "Parameter chatId is required."
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:vote").toResponse();
  }

  const orgId = session.org.id;
  const chat = await getChatById({ id: chatId, orgId });

  if (!chat) {
    return new ChatbotError("not_found:chat").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:vote").toResponse();
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: "up" | "down" } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new ChatbotError(
      "bad_request:api",
      "Parameters chatId, messageId, and type are required."
    ).toResponse();
  }

  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:vote").toResponse();
  }

  const orgId = session.org.id;
  const chat = await getChatById({ id: chatId, orgId });

  if (!chat) {
    return new ChatbotError("not_found:vote").toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatbotError("forbidden:vote").toResponse();
  }

  await voteMessage({
    chatId,
    messageId,
    type,
  });

  return new Response("Message voted", { status: 200 });
}
