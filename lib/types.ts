import type { InferUITool, ToolUIPart, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { searchKnowledge } from "./ai/tools/search-knowledge";
import type { queryDatabase } from "./ai/tools/query-database";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type searchKnowledgeTool = InferUITool<ReturnType<typeof searchKnowledge>>;
type queryDatabaseTool = InferUITool<ReturnType<typeof queryDatabase>>;

/** Generic UI tool type for gateway/provider tools typed as `any`. */
type GenericUITool = {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  searchKnowledge: searchKnowledgeTool;
  queryDatabase: queryDatabaseTool;
  perplexity_search: GenericUITool;
  image_generation: GenericUITool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  chartDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
  /** Extracted text content for document attachments (txt, md, pdf). */
  extractedText?: string;
};
