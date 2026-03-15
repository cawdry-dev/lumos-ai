/**
 * File text extraction for supported document types.
 *
 * Supported MIME types (phase 1):
 *  - `text/plain` (.txt)
 *  - `text/markdown` (.md)
 *  - `application/pdf` (.pdf)
 */

import { PDFParse } from "pdf-parse";

/** MIME types we can extract text from. */
const SUPPORTED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
]);

/**
 * Returns `true` when the given MIME type is supported by the parser.
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

/**
 * Extracts raw text from a file buffer.
 *
 * @param buffer - The raw file contents.
 * @param mimeType - The MIME type of the file.
 * @returns The extracted plain text.
 * @throws If the MIME type is unsupported or parsing fails.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  switch (mimeType) {
    case "text/plain":
    case "text/markdown":
      return buffer.toString("utf-8");

    case "application/pdf": {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    }

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

