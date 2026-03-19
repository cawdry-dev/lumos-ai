"use client";

import { useCallback, useEffect, useState } from "react";
import { useOrgPath } from "@/lib/org-url";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatModel } from "@/lib/ai/models";

/** Provider display names for grouping headings. */
const providerNames: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  reasoning: "Reasoning",
};

/** Groups models by their provider field. */
function groupByProvider(models: ChatModel[]): Record<string, ChatModel[]> {
  return models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, ChatModel[]>
  );
}

export function ModelManagement({ models }: { models: ChatModel[] }) {
  const buildPath = useOrgPath();
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [openProviders, setOpenProviders] = useState<Set<string>>(new Set());

  const toggleProvider = (provider: string) => {
    setOpenProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  // Fetch current enabled models on mount
  useEffect(() => {
    async function fetchEnabled() {
      try {
        const res = await fetch(buildPath("/api/admin/models"));
        if (!res.ok) {
          toast({ type: "error", description: "Failed to load model settings." });
          return;
        }
        const data = await res.json();
        setEnabledIds(new Set(data.enabledModelIds as string[]));
      } catch {
        toast({ type: "error", description: "Failed to load model settings." });
      } finally {
        setLoading(false);
      }
    }
    fetchEnabled();
  }, []);

  const handleToggle = useCallback(
    async (modelId: string, currentlyEnabled: boolean) => {
      setTogglingIds((prev) => new Set(prev).add(modelId));

      try {
        const res = await fetch(buildPath("/api/admin/models"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId, enabled: !currentlyEnabled }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast({
            type: "error",
            description: data.error ?? "Failed to update model.",
          });
          return;
        }

        setEnabledIds((prev) => {
          const next = new Set(prev);
          if (currentlyEnabled) {
            next.delete(modelId);
          } else {
            next.add(modelId);
          }
          return next;
        });
      } catch {
        toast({ type: "error", description: "Failed to update model." });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(modelId);
          return next;
        });
      }
    },
    []
  );

  const grouped = groupByProvider(models);
  // When no models are explicitly enabled, all are considered visible
  const noneEnabled = enabledIds.size === 0;

  if (loading) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        Loading models…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {noneEnabled && (
        <p className="mb-2 text-muted-foreground text-sm">
          No models explicitly enabled — all models are currently visible to
          users. Toggle individual models to restrict the selection.
        </p>
      )}

      {Object.entries(grouped).map(([provider, providerModels]) => {
        const enabledCount = providerModels.filter((m) =>
          noneEnabled ? true : enabledIds.has(m.id)
        ).length;
        const totalCount = providerModels.length;

        return (
          <Collapsible
            key={provider}
            open={openProviders.has(provider)}
            onOpenChange={() => toggleProvider(provider)}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight
                    className={cn(
                      "size-4 transition-transform duration-200",
                      openProviders.has(provider) && "rotate-90"
                    )}
                  />
                  <span>{providerNames[provider] ?? provider}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {enabledCount}/{totalCount} enabled
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pl-6 pt-1 pb-2">
                {providerModels.map((model) => {
                  const isEnabled = noneEnabled || enabledIds.has(model.id);
                  const isToggling = togglingIds.has(model.id);

                  return (
                    <div
                      key={model.id}
                      className="glass-table-row flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {model.description}
                        </p>
                      </div>
                      <Button
                        disabled={isToggling}
                        onClick={() =>
                          handleToggle(
                            model.id,
                            noneEnabled ? false : enabledIds.has(model.id)
                          )
                        }
                        size="sm"
                        variant={
                          isEnabled && !noneEnabled ? "default" : "outline"
                        }
                      >
                        {isEnabled && !noneEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

