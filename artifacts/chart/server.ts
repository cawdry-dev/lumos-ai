import { streamObject } from "ai";
import { z } from "zod";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { getArtifactModel } from "@/lib/ai/providers";
import { recordUsage } from "@/lib/ai/usage";
import { createDocumentHandler } from "@/lib/artifacts/server";

const chartSchema = z.object({
  chart: z.object({
    type: z.enum(["bar", "line", "pie", "area", "scatter"]),
    data: z.array(z.record(z.unknown())),
    xKey: z.string().optional(),
    yKey: z.string().optional(),
    yKeys: z.array(z.string()).optional(),
    title: z.string().optional(),
    xLabel: z.string().optional(),
    yLabel: z.string().optional(),
  }),
});

export const chartDocumentHandler = createDocumentHandler<"chart">({
  kind: "chart",
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = "";

    const { fullStream, usage } = streamObject({
      model: getArtifactModel(),
      system:
        "Generate a chart specification as JSON based on the user's request. " +
        "Return an object with type (bar, line, pie, area, or scatter), data (array of objects), " +
        "xKey, yKey or yKeys (for multiple series), and an optional title. " +
        "Use realistic sample data if none is provided.",
      prompt: title,
      schema: chartSchema,
    });

    for await (const delta of fullStream) {
      if (delta.type === "object" && delta.object?.chart) {
        const json = JSON.stringify(delta.object.chart);

        dataStream.write({
          type: "data-chartDelta",
          data: json,
          transient: true,
        });

        draftContent = json;
      }
    }

    // Ensure final state is written
    dataStream.write({
      type: "data-chartDelta",
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
      system: updateDocumentPrompt(document.content, "chart"),
      prompt: description,
      schema: chartSchema,
    });

    for await (const delta of fullStream) {
      if (delta.type === "object" && delta.object?.chart) {
        const json = JSON.stringify(delta.object.chart);

        dataStream.write({
          type: "data-chartDelta",
          data: json,
          transient: true,
        });

        draftContent = json;
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

