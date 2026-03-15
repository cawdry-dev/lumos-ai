"use client";

import { motion } from "framer-motion";
import { MessageSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopilotOption {
  id: string;
  name: string;
  description: string;
  emoji: string | null;
}

interface CopilotSelectorProps {
  copilots: CopilotOption[];
  selectedCopilotId: string | null;
  onSelect: (copilotId: string | null) => void;
}

/**
 * A card-based picker shown on the new-chat page letting users choose
 * a co-pilot or "General Chat".
 */
export function CopilotSelector({
  copilots,
  selectedCopilotId,
  onSelect,
}: CopilotSelectorProps) {
  if (copilots.length === 0) return null;

  const options: Array<{ id: string | null; name: string; description: string; emoji: string | null }> = [
    {
      id: null,
      name: "General Chat",
      description: "Chat without a specific co-pilot",
      emoji: "💬",
    },
    ...copilots.map((c) => ({
      id: c.id as string | null,
      name: c.name,
      description: c.description,
      emoji: c.emoji,
    })),
  ];

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option, index) => (
        <motion.button
          key={option.id ?? "general"}
          type="button"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.05 * index }}
          onClick={() => onSelect(option.id)}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
            "hover:bg-muted/50",
            selectedCopilotId === option.id
              ? "border-primary bg-primary/5"
              : "border-border",
          )}
        >
          <span className="mt-0.5 text-xl" role="img" aria-label={option.name}>
            {option.emoji ?? <MessageSquareIcon className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{option.name}</div>
            <div className="line-clamp-2 text-muted-foreground text-xs">
              {option.description}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

