import { streamObject } from "ai";
import { z } from "zod";
import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getArtifactModel } from "@/lib/ai/providers";
import { recordUsage } from "@/lib/ai/usage";
import { createDocumentHandler } from "@/lib/artifacts/server";

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = "";

    const { fullStream, usage } = streamObject({
      model: getArtifactModel(),
      system: sheetPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe("CSV data"),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: "data-sheetDelta",
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.write({
      type: "data-sheetDelta",
      data: draftContent,
      transient: true,
    });

    // Record artifact creation token usage
    if (session.user?.id) {
      usage.then((u) => {
        recordUsage({
          userId: session.user.id,
          modelId: "anthropic/claude-haiku-4.5",
          promptTokens: u.inputTokens ?? 0,
          completionTokens: u.outputTokens ?? 0,
          usageType: "artifact",
        });
      });
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    let draftContent = "";

    const { fullStream, usage } = streamObject({
      model: getArtifactModel(),
      system: updateDocumentPrompt(document.content, "sheet"),
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === "object") {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: "data-sheetDelta",
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    // Record artifact update token usage
    if (session.user?.id) {
      usage.then((u) => {
        recordUsage({
          userId: session.user.id,
          modelId: "anthropic/claude-haiku-4.5",
          promptTokens: u.inputTokens ?? 0,
          completionTokens: u.outputTokens ?? 0,
          usageType: "artifact",
        });
      });
    }

    return draftContent;
  },
});
