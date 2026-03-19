import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
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
import { type RequestHints, systemPrompt, memoryPrompt } from "@/lib/ai/prompts";
import { getLanguageModel, isReasoningModel as checkIsReasoningModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { searchKnowledge } from "@/lib/ai/tools/search-knowledge";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { queryDatabase } from "@/lib/ai/tools/query-database";
import { webSearch } from "@/lib/ai/tools/web-search";
import { saveMemory } from "@/lib/ai/tools/save-memory";
import { getMcpTools, closeMcpClients, type MCPClientHandle } from "@/lib/ai/mcp";
import type { DbType, SshConfig } from "@/lib/rag/db-connector";
import { isProductionEnvironment } from "@/lib/constants";
import { resolveImageUrlsForModel } from "@/lib/supabase/storage.server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getCopilotById,
  getAvailableCopilots,
  getMemoriesByUserId,
  getMessageCountByUserId,
  getMessagesByChatId,
  getProfileById,
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

export const dynamic = "force-dynamic";

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

/**
 * Scans finished messages for image_generation tool outputs containing raw
 * base64 data and uploads them to Supabase Storage ("generated-images" bucket).
 * On success the base64 payload is replaced with a compact storage path
 * reference, dramatically reducing the size of the persisted message JSON.
 *
 * Falls back gracefully — if the upload fails the original base64 is kept so
 * the image is still renderable.
 *
 * NOTE: The "generated-images" bucket must be created manually in Supabase
 * Dashboard as a **private** bucket before this will work.
 */
async function uploadGeneratedImages(
  messages: Array<{ id: string; parts: any[] }>,
  chatId: string,
): Promise<void> {
  const supabase = createServiceClient();

  for (const msg of messages) {
    for (const part of msg.parts) {
      // AI SDK tool UI parts use type "tool-image_generation" with
      // state "output-available" and output: { result: "<base64>" }
      if (
        part.type === "tool-image_generation" &&
        part.state === "output-available" &&
        part.output &&
        typeof (part.output as { result?: string }).result === "string" &&
        (part.output as { result: string }).result.length > 1000 // sanity: must look like base64
      ) {
        try {
          const base64: string = (part.output as { result: string }).result;
          const buffer = Buffer.from(base64, "base64");
          const storagePath = `${chatId}/${msg.id}-${Date.now()}.png`;

          const { error } = await supabase.storage
            .from("generated-images")
            .upload(storagePath, buffer, { contentType: "image/png" });

          if (!error) {
            // Replace base64 with a lightweight storage reference
            part.output = {
              storagePath: `generated-images/${storagePath}`,
            };
          } else {
            console.error("Failed to upload generated image:", error);
            // Keep base64 as fallback
          }
        } catch (err) {
          console.error("Error uploading generated image:", err);
          // Keep base64 as fallback
        }
      }
    }
  }
}

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
      selectedChatModel: requestedChatModel,
      selectedVisibilityType,
      copilotId,
      enableWebSearch,
      enableImageGen,
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
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

    // When the co-pilot has a locked model, override the user's selection
    const selectedChatModel = activeCopilot?.modelId ?? requestedChatModel;

    // Validate the selected model is available via the gateway and enabled by admin
    const visibleModels = await getVisibleModels();
    const visibleModelIds = new Set(visibleModels.map((m) => m.id));
    if (!visibleModelIds.has(selectedChatModel)) {
      return new ChatbotError(
        "bad_request:api",
        "The selected model is not currently enabled. Please choose a different model.",
      ).toResponse();
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

    const isReasoningModel = checkIsReasoningModel(selectedChatModel);

    const isKnowledgeCopilot =
      activeCopilot !== null && activeCopilot.type === "knowledge";
    const isDataCopilot =
      activeCopilot !== null && activeCopilot.type === "data";

    // Resolve supabase:attachments/ URLs to signed HTTPS URLs for the AI model
    const resolvedMessages = await resolveImageUrlsForModel(uiMessages);
    const modelMessages = await convertToModelMessages(resolvedMessages);

    // Fetch user profile and memories for personalisation
    const userProfile = await getProfileById(session.user.id);
    const memoryEnabled = userProfile?.memoryEnabled ?? true;

    let memoryContext: string | null = null;
    {
      const memories = memoryEnabled
        ? await getMemoriesByUserId(session.user.id, 50)
        : [];
      memoryContext = memoryPrompt(
        memories.map((m) => m.content),
        {
          displayName: userProfile?.displayName,
          occupation: userProfile?.occupation,
          aboutYou: userProfile?.aboutYou,
          customInstructions: userProfile?.customInstructions,
        },
      );
    }

    // Build the active tools list
    type ToolName = "getWeather" | "createDocument" | "updateDocument" | "requestSuggestions" | "searchKnowledge" | "queryDatabase" | "perplexity_search" | "image_generation" | "saveMemory";

    // Default: web search ON for non-reasoning, image gen ON for GPT-5 non-reasoning
    const webSearchEnabled = enableWebSearch ?? !isReasoningModel;
    const imageGenEnabled = enableImageGen ?? (!isReasoningModel && selectedChatModel.startsWith("openai/gpt-5"));

    // Helper to check if a tool is enabled for this copilot
    const copilotTools = new Set(activeCopilot?.enabledTools ?? []);
    const hasCopilot = activeCopilot !== null;

    const baseActiveTools: ToolName[] = isReasoningModel
      ? ["createDocument", "updateDocument"]
      : (() => {
          const tools: ToolName[] = [];

          // General chat (no copilot) — all tools available
          if (!hasCopilot) {
            tools.push("getWeather", "createDocument", "updateDocument", "requestSuggestions");
            if (webSearchEnabled) tools.push("perplexity_search");
            if (imageGenEnabled && selectedChatModel.startsWith("openai/gpt-5")) {
              tools.push("image_generation");
            }
            if (memoryEnabled) tools.push("saveMemory");
            return tools;
          }

          // Copilot — only core tool + admin-enabled extras
          if (isKnowledgeCopilot) tools.push("searchKnowledge");
          if (isDataCopilot) tools.push("queryDatabase");

          if (copilotTools.has("documents")) {
            tools.push("createDocument", "updateDocument", "requestSuggestions");
          }
          if (copilotTools.has("weather")) tools.push("getWeather");
          if (copilotTools.has("webSearch") && webSearchEnabled) tools.push("perplexity_search");
          if (copilotTools.has("imageGen") && imageGenEnabled && selectedChatModel.startsWith("openai/gpt-5")) {
            tools.push("image_generation");
          }
          if (memoryEnabled) tools.push("saveMemory");

          return tools;
        })();

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

    // Connect to MCP servers (if configured) and gather their tools
    let mcpClients: MCPClientHandle[] = [];
    let mcpTools: Record<string, unknown> = {};
    let mcpInstructions: string[] = [];

    if (activeCopilot?.mcpServers && activeCopilot.mcpServers.length > 0) {
      try {
        const mcpResult = await getMcpTools(activeCopilot.mcpServers);
        mcpClients = mcpResult.clients;
        mcpTools = mcpResult.tools;
        mcpInstructions = mcpResult.instructions;
      } catch (error) {
        console.error("[chat] Failed to initialise MCP tools:", error);
        // Continue without MCP tools
      }
    }

    // Build the combined system prompt, appending any MCP server instructions
    const mcpSystemSuffix = mcpInstructions.length > 0
      ? `\n\n${mcpInstructions.join("\n\n")}`
      : "";

    // Map to capture base64 image data from provider-defined image_generation
    // tool results in onStepFinish, keyed by toolCallId. This data is then
    // used in onFinish to upload to Supabase Storage before persisting.
    const capturedImageData = new Map<string, string>();

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            copilotSystemPrompt: activeCopilot?.systemPrompt
              ? `${activeCopilot.systemPrompt}${mcpSystemSuffix}`
              : mcpSystemSuffix || undefined,
            isKnowledgeCopilot,
            isDataCopilot,
            enabledTools: activeCopilot?.enabledTools,
            memoryContext,
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
            createDocument: createDocument({ session, dataStream, selectedChatModel }),
            updateDocument: updateDocument({ session, dataStream, selectedChatModel }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
            perplexity_search: webSearch,
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
            ...(memoryEnabled && !isReasoningModel
              ? { saveMemory: saveMemory({ userId: session.user.id }) }
              : {}),
            ...mcpTools,
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onStepFinish: ({ finishReason, toolCalls, toolResults, text }) => {
            console.log(`[chat] Step finished: finishReason=${finishReason} toolCalls=${toolCalls.length} toolResults=${toolResults.length} textLength=${text.length}`);

            // Capture base64 image data from provider-defined image_generation
            // tool results before it gets lost in the UI message stream
            // conversion (which only passes through a text summary).
            for (const tr of toolResults) {
              if (
                tr &&
                tr.toolName === "image_generation" &&
                tr.output &&
                typeof (tr.output as { result?: string }).result === "string" &&
                (tr.output as { result: string }).result.length > 1000
              ) {
                console.log(`[chat] Captured image_generation base64 for toolCallId=${tr.toolCallId} (${(tr.output as { result: string }).result.length} chars)`);
                capturedImageData.set(
                  tr.toolCallId,
                  (tr.output as { result: string }).result,
                );
              }
            }
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
        // Close MCP clients now that the stream is done
        if (mcpClients.length > 0) {
          await closeMcpClients(mcpClients);
        }

        // Inject captured base64 image data into message parts before upload.
        // Provider-defined tools (like openai.tools.imageGeneration) only pass
        // a text summary ("Generated image") through the UI message stream,
        // so the actual base64 data captured in onStepFinish needs to be
        // patched back into the parts here.
        if (capturedImageData.size > 0) {
          for (const msg of finishedMessages) {
            for (const part of msg.parts) {
              if (
                part.type === "tool-image_generation" &&
                part.state === "output-available" &&
                part.toolCallId &&
                capturedImageData.has(part.toolCallId)
              ) {
                const base64 = capturedImageData.get(part.toolCallId)!;
                console.log(`[chat] Injecting captured base64 into tool part toolCallId=${part.toolCallId}`);
                (part as any).output = { result: base64 };
              }
            }
          }
        }

        // Upload generated images to Supabase Storage and replace base64
        // with storage path references to avoid bloating the database.
        // NOTE: The "generated-images" bucket must be created manually in
        // Supabase (private, not public).
        await uploadGeneratedImages(finishedMessages, id);

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
