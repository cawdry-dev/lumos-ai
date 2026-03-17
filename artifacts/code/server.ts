import { streamObject } from "ai";
import { z } from "zod";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getArtifactModel, getArtifactModelId } from "@/lib/ai/providers";
import { recordUsage } from "@/lib/ai/usage";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, dataStream, session, modelId }) => {
    let draftContent = "";

    const { fullStream, usage } = streamObject({
      model: getArtifactModel(modelId),
      system: codePrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
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

    const { fullStream, usage } = streamObject({
      model: getArtifactModel(modelId),
      system: updateDocumentPrompt(document.content, "code"),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: "data-codeDelta",
            data: code ?? "",
            transient: true,
          });

          draftContent = code;
        }
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
