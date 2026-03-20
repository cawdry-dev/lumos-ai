import { cookies } from "next/headers";
import { Suspense } from "react";
import { Loader } from "@/components/ai-elements/loader";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getVisibleModels } from "@/lib/ai/models.server";
import { auth } from "@/lib/supabase/auth";
import { generateUUID } from "@/lib/utils";

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center"><Loader size={24} /></div>}>
      <NewChatPage params={params} />
    </Suspense>
  );
}

async function NewChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth(slug);
  const orgId = session?.org?.id ?? "";
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const id = generateUUID();
  const visibleModels = await getVisibleModels(orgId);

  // Fall back to the first visible model if the cookie-stored model
  // is no longer enabled by the admin.
  const cookieModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;
  const visibleIds = new Set(visibleModels.map((m) => m.id));
  const selectedModel = visibleIds.has(cookieModel)
    ? cookieModel
    : visibleModels[0]?.id ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={selectedModel}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        visibleModels={visibleModels}
      />
      <DataStreamHandler />
    </>
  );
}
