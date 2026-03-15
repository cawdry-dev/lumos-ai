import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  gateway,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/lib/supabase/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { checkCostLimits, recordUsage } from "@/lib/ai/usage";
import { getVisibleModels } from "@/lib/ai/models.server";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchKnowledge } from "@/lib/ai/tools/search-knowledge";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { queryDatabase } from "@/lib/ai/tools/query-database";
import type { DbType, SshConfig } from "@/lib/rag/db-connector";
import { isProductionEnvironment } from "@/lib/constants";
import { resolveImageUrlsForModel } from "@/lib/supabase/storage.server";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getCopilotById,
  getAvailableCopilots,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedChatModel,
      selectedVisibilityType,
      copilotId,
      enableWebSearch,
      enableImageGen,
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    // Validate the selected model is available via the gateway and enabled by admin
    const visibleModels = await getVisibleModels();
    const visibleModelIds = new Set(visibleModels.map((m) => m.id));
    if (!visibleModelIds.has(selectedChatModel)) {
      return new ChatbotError(
        "bad_request:api",
        "The selected model is not currently enabled. Please choose a different model.",
      ).toResponse();
    }

    // If a co-pilot is specified, load it and verify user access
    let activeCopilot: Awaited<ReturnType<typeof getCopilotById>> | null = null;
    if (copilotId) {
      activeCopilot = await getCopilotById(copilotId);
      if (!activeCopilot || !activeCopilot.isActive) {
        return new ChatbotError("bad_request:api").toResponse();
      }
      // Verify the user has access to this co-pilot
      const available = await getAvailableCopilots(session.user.id);
      if (!available.some((c) => c.id === copilotId)) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
    }

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.role as UserType;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    // Pre-flight cost limit check
    const costLimitExceeded = await checkCostLimits(session.user.id, userType);
    if (costLimitExceeded) {
      return new ChatbotError("usage_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      if (!isToolApprovalFlow) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
        title: "New chat",
        visibility: selectedVisibilityType,
        copilotId: copilotId ?? null,
      });
      titlePromise = generateTitleFromUserMessage({ message, userId: session.user.id });
    }

    const uiMessages = isToolApprovalFlow
      ? (messages as ChatMessage[])
      : [...convertToUIMessages(messagesFromDb), message as ChatMessage];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const isReasoningModel =
      selectedChatModel.endsWith("-thinking") ||
      (selectedChatModel.includes("reasoning") &&
        !selectedChatModel.includes("non-reasoning"));

    const isKnowledgeCopilot =
      activeCopilot !== null && activeCopilot.type === "knowledge";
    const isDataCopilot =
      activeCopilot !== null && activeCopilot.type === "data";

    // Resolve supabase:attachments/ URLs to signed HTTPS URLs for the AI model
    const resolvedMessages = await resolveImageUrlsForModel(uiMessages);
    const modelMessages = await convertToModelMessages(resolvedMessages);

    // Build the active tools list
    type ToolName = "getWeather" | "createDocument" | "updateDocument" | "requestSuggestions" | "searchKnowledge" | "queryDatabase" | "perplexity_search" | "image_generation";

    // Default: web search ON for non-reasoning, image gen ON for GPT-5 non-reasoning
    const webSearchEnabled = enableWebSearch ?? !isReasoningModel;
    const imageGenEnabled = enableImageGen ?? (!isReasoningModel && selectedChatModel.startsWith("openai/gpt-5"));

    const baseActiveTools: ToolName[] = isReasoningModel
      ? []
      : [
          "getWeather",
          "createDocument",
          "updateDocument",
          "requestSuggestions",
          ...(webSearchEnabled ? ["perplexity_search" as ToolName] : []),
        ];

    // Image generation is only available for OpenAI GPT-5 models
    if (!isReasoningModel && selectedChatModel.startsWith("openai/gpt-5") && imageGenEnabled) {
      baseActiveTools.push("image_generation");
    }

    if (isKnowledgeCopilot && !isReasoningModel) {
      baseActiveTools.push("searchKnowledge");
    }

    if (isDataCopilot && !isReasoningModel) {
      baseActiveTools.push("queryDatabase");
    }

    // Build SSH config for data co-pilots if SSH fields are present
    const sshConfig: SshConfig | undefined =
      isDataCopilot && activeCopilot?.sshHost && activeCopilot?.sshUsername && activeCopilot?.sshPrivateKey
        ? {
            host: activeCopilot.sshHost,
            port: activeCopilot.sshPort ?? 22,
            username: activeCopilot.sshUsername,
            privateKey: activeCopilot.sshPrivateKey,
          }
        : undefined;

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            copilotSystemPrompt: activeCopilot?.systemPrompt,
            isKnowledgeCopilot,
            isDataCopilot,
          }),
          messages: modelMessages,
          stopWhen: stepCountIs(5),
          experimental_activeTools: baseActiveTools,
          providerOptions: isReasoningModel
            ? {
                anthropic: {
                  thinking: { type: "enabled", budgetTokens: 10_000 },
                },
              }
            : undefined,
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
            perplexity_search: gateway.tools.perplexitySearch() as any,
            image_generation: openai.tools.imageGeneration({ model: "gpt-image-1", quality: "medium" }) as any,
            ...(isKnowledgeCopilot && activeCopilot
              ? {
                  searchKnowledge: searchKnowledge({
                    copilotId: activeCopilot.id,
                  }),
                }
              : {}),
            ...(isDataCopilot && activeCopilot?.dbConnectionString && activeCopilot?.dbType
              ? {
                  queryDatabase: queryDatabase({
                    copilotId: activeCopilot.id,
                    connectionString: activeCopilot.dbConnectionString,
                    dbType: activeCopilot.dbType as DbType,
                    ssh: sshConfig,
                  }),
                }
              : {}),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel })
        );

        // Record chat token usage once the stream completes
        result.usage.then((usage) => {
          recordUsage({
            userId: session.user.id,
            chatId: id,
            copilotId: copilotId ?? null,
            modelId: selectedChatModel,
            promptTokens: usage.inputTokens ?? 0,
            completionTokens: usage.outputTokens ?? 0,
            usageType: "chat",
          });
        });

        if (titlePromise) {
          const title = await titlePromise;
          dataStream.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
      onError: (error) => {
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "AI Gateway requires a valid credit card on file to service requests. Please visit https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card to add a card and unlock your free credits.";
        }
        return "Oops, an error occurred!";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch (_) {
          // ignore redis errors
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
