import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Loader } from "@/components/ai-elements/loader";
import { auth } from "@/lib/supabase/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getVisibleModels } from "@/lib/ai/models.server";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center"><Loader size={24} /></div>}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const chat = await getChatById({ id });

  if (!chat) {
    redirect("/");
  }

  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  const visibleModels = await getVisibleModels();

  // Fall back to the first visible model if the cookie-stored model
  // is no longer enabled by the admin.
  const cookieModel = chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL;
  const visibleIds = new Set(visibleModels.map((m) => m.id));
  const selectedModel = visibleIds.has(cookieModel)
    ? cookieModel
    : visibleModels[0]?.id ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        autoResume={true}
        copilotId={chat.copilotId}
        id={chat.id}
        initialChatModel={selectedModel}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        visibleModels={visibleModels}
      />
      <DataStreamHandler />
    </>
  );
}
