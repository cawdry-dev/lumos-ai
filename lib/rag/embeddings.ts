/**
 * Embedding generation via the AI Gateway.
 *
 * Uses `openai/text-embedding-3-small` (1 536 dimensions) through the
 * Vercel AI SDK's `@ai-sdk/gateway` provider.
 */

import { gateway } from "@ai-sdk/gateway";
import { embedMany } from "ai";
import { recordUsage } from "@/lib/ai/usage";

/** The embedding model used for all knowledge-base vectors. */
const EMBEDDING_MODEL_ID = "openai/text-embedding-3-small";

/** Maximum texts to embed in a single API call. */
const BATCH_SIZE = 20;

export interface EmbeddingResult {
  /** The embedding vector (1 536 floats). */
  embedding: number[];
  /** The original text that was embedded. */
  text: string;
}

/**
 * Generates embeddings for an array of text chunks.
 *
 * Chunks are processed in batches of {@link BATCH_SIZE} to stay within
 * API limits. Returns one {@link EmbeddingResult} per input text, in the
 * same order.
 *
 * When `userId` is provided, token usage is recorded for cost tracking.
 */
export async function generateEmbeddings(
  texts: string[],
  options?: { userId?: string; copilotId?: string | null },
): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const results: EmbeddingResult[] = [];
  let totalTokens = 0;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const { embeddings, usage } = await embedMany({
      model: gateway.textEmbeddingModel(EMBEDDING_MODEL_ID),
      values: batch,
    });

    totalTokens += usage?.tokens ?? 0;

    for (let j = 0; j < batch.length; j++) {
      results.push({
        embedding: embeddings[j],
        text: batch[j],
      });
    }
  }

  // Record embedding token usage if a userId was provided
  if (options?.userId && totalTokens > 0) {
    recordUsage({
      userId: options.userId,
      copilotId: options.copilotId ?? null,
      modelId: EMBEDDING_MODEL_ID,
      promptTokens: totalTokens,
      completionTokens: 0,
      usageType: "embedding",
    });
  }

  return results;
}

