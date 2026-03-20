import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "@/lib/supabase/auth";
import { z } from "zod";
import { documentHandlersByArtifactKind } from "@/lib/artifacts/server";
import { getDocumentById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type UpdateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  selectedChatModel?: string;
  orgId: string;
};

export const updateDocument = ({ session, dataStream, selectedChatModel, orgId }: UpdateDocumentProps) =>
  tool({
    description: "Update a document with the given description.",
    inputSchema: z.object({
      id: z.string().describe("The ID of the document to update"),
      description: z
        .string()
        .describe("The description of changes that need to be made"),
    }),
    execute: async ({ id, description }) => {
      const document = await getDocumentById({ id, orgId });

      if (!document) {
        return {
          error: "Document not found",
        };
      }

      dataStream.write({
        type: "data-clear",
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      try {
        await documentHandler.onUpdateDocument({
          document,
          description,
          dataStream,
          session,
          modelId: selectedChatModel,
        });
      } catch (error) {
        console.error("[updateDocument] Document update failed:", error);
      } finally {
        dataStream.write({ type: "data-finish", data: null, transient: true });
      }

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: "The document has been updated successfully.",
      };
    },
  });
