"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { type ChatModel, chatModels } from "@/lib/ai/models";

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

export function ModelManagement() {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Fetch current enabled models on mount
  useEffect(() => {
    async function fetchEnabled() {
      try {
        const res = await fetch("/api/admin/models");
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
        const res = await fetch("/api/admin/models", {
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

  const grouped = groupByProvider(chatModels);
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
    <div className="space-y-6">
      {noneEnabled && (
        <p className="text-muted-foreground text-sm">
          No models explicitly enabled — all models are currently visible to
          users. Toggle individual models to restrict the selection.
        </p>
      )}

      {Object.entries(grouped).map(([provider, models]) => (
        <div key={provider}>
          <h3 className="mb-2 font-medium text-sm text-muted-foreground">
            {providerNames[provider] ?? provider}
          </h3>
          <div className="space-y-1">
            {models.map((model) => {
              const isEnabled = noneEnabled || enabledIds.has(model.id);
              const isToggling = togglingIds.has(model.id);

              return (
                <div
                  key={model.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
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
                    variant={isEnabled && !noneEnabled ? "default" : "outline"}
                  >
                    {isEnabled && !noneEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

