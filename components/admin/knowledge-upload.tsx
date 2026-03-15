"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const ACCEPTED_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
];

const ACCEPTED_EXTENSIONS = ".txt,.md,.pdf";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function KnowledgeUpload({
  copilotId,
  onUploaded,
}: {
  copilotId: string;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({
          type: "error",
          description:
            "Unsupported file type. Only .txt, .md, and .pdf files are allowed.",
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          type: "error",
          description: "File exceeds the 10 MB size limit.",
        });
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/copilots/${copilotId}/documents`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          toast({
            type: "error",
            description: data.error ?? "Failed to upload file.",
          });
          return;
        }

        toast({ type: "success", description: "File uploaded successfully." });
        onUploaded();
      } catch {
        toast({ type: "error", description: "Failed to upload file." });
      } finally {
        setUploading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [copilotId, onUploaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Upload className="size-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">
          {uploading ? "Uploading…" : "Drag and drop a file here"}
        </p>
        <p className="text-xs text-muted-foreground">
          Supports .txt, .md, and .pdf — max 10 MB
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "Choose file"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

