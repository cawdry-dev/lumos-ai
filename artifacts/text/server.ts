import { smoothStream, streamText } from "ai";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getArtifactModel, getArtifactModelId } from "@/lib/ai/providers";
import { recordUsage } from "@/lib/ai/usage";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, session, modelId }) => {
    let draftContent = "";

    const { fullStream, usage } = streamText({
      model: getArtifactModel(modelId),
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: title,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    // Record artifact creation token usage
    if (session.user?.id) {
      usage.then((u) => {
        recordUsage({
          userId: session.user.id,
          modelId: getArtifactModelId(modelId),
          promptTokens: u.inputTokens ?? 0,
          completionTokens: u.outputTokens ?? 0,
          usageType: "artifact",
        });
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session, modelId }) => {
    let draftContent = "";

    const { fullStream, usage } = streamText({
      model: getArtifactModel(modelId),
      system: updateDocumentPrompt(document.content, "text"),
      experimental_transform: smoothStream({ chunking: "word" }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: "content",
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "text-delta") {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: "data-textDelta",
          data: text,
          transient: true,
        });
      }
    }

    // Record artifact update token usage
    if (session.user?.id) {
      usage.then((u) => {
        recordUsage({
          userId: session.user.id,
          modelId: getArtifactModelId(modelId),
          promptTokens: u.inputTokens ?? 0,
          completionTokens: u.outputTokens ?? 0,
          usageType: "artifact",
        });
      });
    }

    return draftContent;
  },
});
