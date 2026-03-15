/**
 * Recursive character text splitter for RAG chunking.
 *
 * Splits text into chunks of approximately `maxTokens` tokens with
 * `overlapTokens` token overlap, preserving paragraph boundaries where
 * possible.
 */

/** Rough token estimate — 1 token ≈ 4 characters for English text. */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface Chunk {
  /** The text content of this chunk. */
  content: string;
  /** Estimated token count. */
  tokenCount: number;
  /** Zero-based index within the document. */
  index: number;
}

export interface ChunkerOptions {
  /** Target maximum tokens per chunk (default: 500). */
  maxTokens?: number;
  /** Overlap tokens between consecutive chunks (default: 50). */
  overlapTokens?: number;
}

const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 50;

/**
 * Separators ordered from coarsest to finest granularity.
 * The splitter tries each in turn until chunks are small enough.
 */
const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

/**
 * Recursively splits `text` using the provided separators until every
 * piece is at or below `maxTokens`.
 */
function splitRecursive(
  text: string,
  separators: string[],
  maxTokens: number,
): string[] {
  if (estimateTokenCount(text) <= maxTokens) {
    return [text];
  }

  const [separator, ...remainingSeparators] = separators;

  // If we've exhausted all separators, hard-split by character count.
  if (separator === undefined || separator === "") {
    const maxChars = maxTokens * 4;
    const pieces: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) {
      pieces.push(text.slice(i, i + maxChars));
    }
    return pieces;
  }

  const parts = text.split(separator);
  const merged: string[] = [];
  let current = "";

  for (const part of parts) {
    const candidate = current ? current + separator + part : part;
    if (estimateTokenCount(candidate) <= maxTokens) {
      current = candidate;
    } else {
      if (current) merged.push(current);
      // If the individual part is still too large, split it further.
      if (estimateTokenCount(part) > maxTokens) {
        merged.push(...splitRecursive(part, remainingSeparators, maxTokens));
        current = "";
      } else {
        current = part;
      }
    }
  }

  if (current) merged.push(current);
  return merged;
}

/**
 * Splits a document into overlapping chunks suitable for embedding.
 *
 * @param text - The full document text.
 * @param options - Chunking configuration.
 * @returns An array of {@link Chunk} objects.
 */
export function chunkText(text: string, options?: ChunkerOptions): Chunk[] {
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = options?.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  const rawPieces = splitRecursive(text.trim(), SEPARATORS, maxTokens);

  // Apply overlap by prepending trailing text from the previous chunk.
  const chunks: Chunk[] = [];
  let previousTail = "";

  for (let i = 0; i < rawPieces.length; i++) {
    const piece = rawPieces[i];
    const content = previousTail ? `${previousTail} ${piece}`.trim() : piece.trim();

    if (!content) continue;

    chunks.push({
      content,
      tokenCount: estimateTokenCount(content),
      index: chunks.length,
    });

    // Keep the last `overlapTokens` worth of characters for the next chunk.
    const overlapChars = overlapTokens * 4;
    previousTail =
      piece.length > overlapChars ? piece.slice(-overlapChars) : piece;
  }

  return chunks;
}

