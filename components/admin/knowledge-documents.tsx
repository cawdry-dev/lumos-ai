"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, FileText, Loader2 } from "lucide-react";
import { KnowledgeUpload } from "./knowledge-upload";

type KnowledgeDoc = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  status: "processing" | "ready" | "error";
  chunkCount: number;
  createdAt: string;
};

const STATUS_BADGE: Record<
  KnowledgeDoc["status"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  processing: { label: "Processing", variant: "secondary" },
  ready: { label: "Ready", variant: "default" },
  error: { label: "Error", variant: "destructive" },
};

export function KnowledgeDocuments({ copilotId }: { copilotId: string }) {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/copilots/${copilotId}/documents`);
      if (!res.ok) {
        toast({ type: "error", description: "Failed to load documents." });
        return;
      }
      const data = await res.json();
      setDocuments(data.documents);
    } catch {
      toast({ type: "error", description: "Failed to load documents." });
    } finally {
      setLoading(false);
    }
  }, [copilotId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for status updates when any document is processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleDelete = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      const res = await fetch(
        `/api/copilots/${copilotId}/documents/${documentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        toast({
          type: "error",
          description: data.error ?? "Failed to delete document.",
        });
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      toast({ type: "success", description: "Document deleted." });
    } catch {
      toast({ type: "error", description: "Failed to delete document." });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        Loading documents…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <KnowledgeUpload copilotId={copilotId} onUploaded={fetchDocuments} />

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents uploaded yet. Upload a file above to get started.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="glass-table-header border-b text-left text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">Document</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Chunks</th>
              <th className="px-3 py-2.5 font-medium">Uploaded</th>
              <th className="px-3 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const badge = STATUS_BADGE[doc.status];
              return (
                <tr key={doc.id} className="glass-table-row border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.fileName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={badge.variant} className="gap-1">
                      {doc.status === "processing" && (
                        <Loader2 className="size-3 animate-spin" />
                      )}
                      {badge.label}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {doc.chunkCount}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={deletingId === doc.id}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete document</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove &ldquo;{doc.title}
                            &rdquo; and all its chunks. This action cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(doc.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

