import "server-only";

import { getEnabledModels } from "@/lib/db/queries";
import { type ChatModel, chatModels } from "./models";

/**
 * Returns the list of models visible to users.
 * If any models have been explicitly enabled by an admin, only those are returned.
 * If no models are enabled (empty table), all models are returned as a safe default.
 */
export async function getVisibleModels(): Promise<ChatModel[]> {
  const enabledRows = await getEnabledModels();

  if (enabledRows.length === 0) {
    return chatModels;
  }

  const enabledIds = new Set(enabledRows.map((row) => row.id));
  return chatModels.filter((model) => enabledIds.has(model.id));
}

/**
 * Returns visible models grouped by provider, mirroring the shape of `modelsByProvider`.
 */
export async function getVisibleModelsByProvider(): Promise<
  Record<string, ChatModel[]>
> {
  const visible = await getVisibleModels();

  return visible.reduce(
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

