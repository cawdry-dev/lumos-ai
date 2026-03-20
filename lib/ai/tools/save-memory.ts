import { tool } from "ai";
import { z } from "zod";
import { createMemory } from "@/lib/db/queries";

export function saveMemory({ userId, orgId }: { userId: string; orgId: string }) {
  return tool({
    description:
      "Save a fact or preference about the user to memory. Use this when the user shares personal information, preferences, or important context that would be useful to remember in future conversations. Only save genuinely useful facts — not transient conversation details.",
    inputSchema: z.object({
      content: z
        .string()
        .describe(
          "A concise fact about the user to remember, written in third person (e.g. 'Prefers concise responses', 'Works as a software engineer at Acme Corp')",
        ),
    }),
    execute: async ({ content }) => {
      await createMemory(userId, content, orgId);
      return "Memory saved.";
    },
  });
}

