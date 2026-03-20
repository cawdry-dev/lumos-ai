"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { auth } from "@/lib/supabase/auth";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import { recordUsage } from "@/lib/ai/usage";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisibilityById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
  userId,
  orgId,
}: {
  message: UIMessage;
  userId?: string;
  orgId?: string;
}) {
  const { text, usage } = await generateText({
    model: getTitleModel(),
    system: titlePrompt,
    prompt: getTextFromMessage(message),
  });

  // Record title generation token usage
  if (userId && orgId) {
    recordUsage({
      userId,
      modelId: "google/gemini-2.5-flash-lite",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      usageType: "title",
      orgId,
    });
  }

  return text
    .replace(/^[#*"\s]+/, "")
    .replace(/["]+$/, "")
    .trim();
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
  slug,
}: {
  chatId: string;
  visibility: VisibilityType;
  slug: string;
}) {
  const session = await auth(slug);
  if (!session?.org) {
    throw new Error("Organisation context required.");
  }
  await updateChatVisibilityById({ chatId, orgId: session.org.id, visibility });
}
