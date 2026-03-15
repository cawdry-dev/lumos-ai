import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { getEnabledModels } from "@/lib/db/queries";
import type { ChatModel } from "./models";
import { getGatewayModels } from "./gateway";

/**
 * Returns the list of models visible to users.
 * Fetches the full model list from the AI Gateway, then filters
 * to only admin-enabled models. If no models are explicitly enabled
 * (empty table), all gateway models are returned as a safe default.
 *
 * Uses noStore() to prevent Next.js from caching this data, ensuring
 * admin changes to enabled models are reflected immediately.
 */
export async function getVisibleModels(): Promise<ChatModel[]> {
  noStore();
  const [allModels, enabledRows] = await Promise.all([
    getGatewayModels(),
    getEnabledModels(),
  ]);

  if (enabledRows.length === 0) {
    return allModels;
  }

  const enabledIds = new Set(enabledRows.map((row) => row.id));
  return allModels.filter((model) => enabledIds.has(model.id));
}

/**
 * Returns visible models grouped by provider.
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

