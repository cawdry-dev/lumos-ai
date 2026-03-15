import { tool } from "ai";
import { z } from "zod";
import {
  searchKnowledgeChunks,
  getKnowledgeDocumentById,
} from "@/lib/db/queries";
import { generateEmbeddings } from "@/lib/rag/embeddings";

/**
 * Creates a `searchKnowledge` tool scoped to a specific co-pilot.
 *
 * The tool embeds the user's query, searches the co-pilot's knowledge
 * base for the most relevant chunks, and returns them with source
 * document titles so the LLM can cite its sources.
 */
export function searchKnowledge({ copilotId }: { copilotId: string }) {
  return tool({
    description:
      "Search the knowledge base for relevant information. Use this when the user asks about internal topics.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant knowledge base content"),
    }),
    execute: async ({ query }) => {
      // Embed the query
      const [embeddingResult] = await generateEmbeddings([query]);

      if (!embeddingResult) {
        return { results: [], message: "Failed to generate query embedding." };
      }

      // Search for the top 5 most relevant chunks
      const chunks = await searchKnowledgeChunks(
        copilotId,
        embeddingResult.embedding,
        5,
      );

      if (chunks.length === 0) {
        return {
          results: [],
          message: "No relevant information found in the knowledge base.",
        };
      }

      // Resolve document titles for citation
      const documentTitles = new Map<string, string>();
      for (const chunk of chunks) {
        if (!documentTitles.has(chunk.documentId)) {
          const doc = await getKnowledgeDocumentById(chunk.documentId);
          documentTitles.set(chunk.documentId, doc?.title ?? "Unknown document");
        }
      }

      const results = chunks.map((chunk) => ({
        content: chunk.content,
        sourceDocument: documentTitles.get(chunk.documentId) ?? "Unknown document",
        similarity: chunk.similarity,
      }));

      return {
        results,
        message: `Found ${results.length} relevant chunk(s). Cite the source document titles in your response.`,
      };
    },
  });
}

