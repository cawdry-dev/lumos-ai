/**
 * Document ingestion pipeline.
 *
 * Orchestrates the full flow: file buffer → parse text → chunk →
 * generate embeddings → store in the database.
 *
 * Status transitions: `processing` → `ready` (success) or `error` (failure).
 */

import {
  insertKnowledgeChunks,
  updateKnowledgeDocumentStatus,
} from "@/lib/db/queries";

import { chunkText } from "./chunker";
import { generateEmbeddings } from "./embeddings";
import { extractText, isSupportedMimeType } from "./parse";

export interface IngestDocumentInput {
  /** The knowledge document ID (already persisted with status `processing`). */
  documentId: string;
  /** Raw file contents. */
  buffer: Buffer;
  /** MIME type of the uploaded file. */
  mimeType: string;
  /** Organisation ID for data isolation. */
  orgId: string;
}

/**
 * Runs the full ingestion pipeline for a single document.
 *
 * 1. Parse the file to extract raw text.
 * 2. Split the text into overlapping chunks.
 * 3. Generate embeddings for each chunk via the AI Gateway.
 * 4. Bulk-insert chunk rows into the database.
 * 5. Update the document status to `ready` with the chunk count.
 *
 * On any failure the document status is set to `error` and the
 * original error is re-thrown.
 */
export async function ingestDocument(input: IngestDocumentInput): Promise<void> {
  const { documentId, buffer, mimeType, orgId } = input;

  try {
    // ------------------------------------------------------------------
    // 1. Validate & parse
    // ------------------------------------------------------------------
    if (!isSupportedMimeType(mimeType)) {
      throw new Error(`Unsupported file type for ingestion: ${mimeType}`);
    }

    const rawText = await extractText(buffer, mimeType);

    if (!rawText.trim()) {
      throw new Error("Document contains no extractable text");
    }

    // ------------------------------------------------------------------
    // 2. Chunk
    // ------------------------------------------------------------------
    const chunks = chunkText(rawText);

    if (chunks.length === 0) {
      throw new Error("Chunking produced no chunks");
    }

    // ------------------------------------------------------------------
    // 3. Embed
    // ------------------------------------------------------------------
    const embeddings = await generateEmbeddings(
      chunks.map((c) => c.content),
    );

    // ------------------------------------------------------------------
    // 4. Store chunks
    // ------------------------------------------------------------------
    await insertKnowledgeChunks(
      chunks.map((chunk, i) => ({
        documentId,
        content: chunk.content,
        embedding: embeddings[i].embedding,
        tokenCount: chunk.tokenCount,
        chunkIndex: chunk.index,
        metadata: {},
        orgId,
      })),
    );

    // ------------------------------------------------------------------
    // 5. Mark document as ready
    // ------------------------------------------------------------------
    await updateKnowledgeDocumentStatus(documentId, "ready", chunks.length);
  } catch (error) {
    // Set the document to error state so the UI can surface the failure.
    try {
      await updateKnowledgeDocumentStatus(documentId, "error");
    } catch {
      // Swallow — we still want to re-throw the original error.
    }

    throw error;
  }
}

