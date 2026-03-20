import type { UIMessageStreamWriter } from "ai";
import type { Session } from "@/lib/supabase/auth";
import { chartDocumentHandler } from "@/artifacts/chart/server";
import { codeDocumentHandler } from "@/artifacts/code/server";
import { sheetDocumentHandler } from "@/artifacts/sheet/server";
import { textDocumentHandler } from "@/artifacts/text/server";
import type { ArtifactKind } from "@/components/artifact";
import { saveDocument } from "../db/queries";
import type { Document } from "../db/schema";
import type { ChatMessage } from "../types";

export type SaveDocumentProps = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  orgId: string;
};

export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  modelId?: string;
};

export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  session: Session;
  modelId?: string;
};

export type DocumentHandler<T = ArtifactKind> = {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      let draftContent: string;

      try {
        draftContent = await config.onCreateDocument({
          id: args.id,
          title: args.title,
          dataStream: args.dataStream,
          session: args.session,
          modelId: args.modelId,
        });
      } catch (error) {
        console.error(
          `[artifact] Failed to create ${config.kind} document:`,
          error,
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        draftContent = `[Error creating document: ${errorMessage}]`;

        // Write error feedback to the data stream so the UI is not left empty
        args.dataStream.write({
          type: "data-textDelta" as const,
          data: draftContent,
          transient: true,
        });
      }

      if (args.session?.user?.id && args.session?.org?.id) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
          orgId: args.session.org.id,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      let draftContent: string;

      try {
        draftContent = await config.onUpdateDocument({
          document: args.document,
          description: args.description,
          dataStream: args.dataStream,
          session: args.session,
          modelId: args.modelId,
        });
      } catch (error) {
        console.error(
          `[artifact] Failed to update ${config.kind} document:`,
          error,
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        draftContent = `[Error updating document: ${errorMessage}]`;

        // Write error feedback to the data stream so the UI is not left empty
        args.dataStream.write({
          type: "data-textDelta" as const,
          data: draftContent,
          transient: true,
        });
      }

      if (args.session?.user?.id && args.session?.org?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
          orgId: args.session.org.id,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  sheetDocumentHandler,
  chartDocumentHandler,
];

export const artifactKinds = ["text", "code", "sheet", "chart"] as const;
