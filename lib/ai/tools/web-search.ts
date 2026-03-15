import { generateText, gateway, tool } from "ai";
import { z } from "zod";

/**
 * Web search tool that wraps the AI Gateway's Perplexity Search.
 *
 * Why a wrapper?
 * `gateway.tools.perplexitySearch()` is a *provider-executed* tool
 * (type: "provider"). The AI SDK's multi-step loop only continues
 * after *client-executed* tool calls (see vercel/ai#12178). By
 * wrapping the gateway tool inside a regular `tool()` with a local
 * `execute` function, the SDK treats the search as a client tool
 * and correctly continues to the text-generation step after the
 * search results are returned.
 */
export const webSearch = tool({
  description:
    "Search the web for current information using Perplexity. " +
    "Use this when the user asks about recent events, current data, " +
    "or anything that requires up-to-date information.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query to find relevant web results"),
  }),
  execute: async ({ query }) => {
    try {
      // Use generateText with a cheap model to execute the gateway's
      // perplexity search tool. The model calls the tool, the gateway
      // executes it, and we extract the results from the step content.
      const result = await generateText({
        model: gateway("openai/gpt-4.1-nano"),
        prompt: `Search the web for: ${query}`,
        tools: {
          perplexity_search: gateway.tools.perplexitySearch(),
        },
      });

      // Extract tool results from all steps — the provider-executed
      // tool result is stored in the step content with type "tool-result"
      for (const step of result.steps) {
        for (const part of step.content) {
          if (part.type === "tool-result" && part.toolName === "perplexity_search") {
            return part.output;
          }
        }
      }

      // Fallback: if the model generated text instead of using the tool,
      // return the text as the search result
      if (result.text) {
        return { text: result.text };
      }

      return { error: "No search results returned" };
    } catch (error) {
      console.error("[web-search] Error executing search:", error);
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

