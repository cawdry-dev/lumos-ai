import type { Attachment } from "@/lib/types";
import { resolveAttachmentUrl } from "@/lib/supabase/storage";
import { FileTextIcon } from "lucide-react";
import { Loader } from "./elements/loader";
import { CrossSmallIcon } from "./icons";
import { Button } from "./ui/button";

/** Extract the file extension from a filename/path (e.g. "report.pdf" → "PDF"). */
function getFileExtension(name?: string): string {
  if (!name) return "DOC";
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "DOC";
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url: rawUrl, contentType } = attachment;
  const url = resolveAttachmentUrl(rawUrl);

  return (
    <div
      className="group relative size-16 overflow-hidden rounded-lg border bg-muted"
      data-testid="input-attachment-preview"
    >
      {contentType?.startsWith("image") ? (
        // biome-ignore lint/performance/noImgElement: dynamic user-uploaded images served via API redirect
        <img
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-0.5 text-muted-foreground">
          <FileTextIcon className="size-5" />
          <span className="text-[9px] font-medium leading-none">
            {getFileExtension(name)}
          </span>
        </div>
      )}

      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          data-testid="input-attachment-loader"
        >
          <Loader size={16} />
        </div>
      )}

      {onRemove && !isUploading && (
        <Button
          className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="sm"
          variant="destructive"
        >
          <CrossSmallIcon size={8} />
        </Button>
      )}

      <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {name}
      </div>
    </div>
  );
};
