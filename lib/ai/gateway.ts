import "server-only";

import type { ChatModel } from "./models";
import { FALLBACK_MODELS } from "./models";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/models";
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes

/** In-memory cache for gateway models. */
let cachedModels: ChatModel[] | null = null;
let cacheTimestamp = 0;

/**
 * Generates a human-friendly name from a model ID.
 * Strips the provider prefix, replaces hyphens with spaces, and title-cases.
 *
 * e.g. "openai/gpt-4.1-mini" → "Gpt 4.1 Mini"
 */
function humaniseName(modelId: string): string {
  const slug = modelId.includes("/") ? modelId.split("/").slice(1).join("/") : modelId;
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Extracts the provider from a model ID prefix.
 * e.g. "openai/gpt-4.1-mini" → "openai"
 */
function extractProvider(modelId: string): string {
  const slashIndex = modelId.indexOf("/");
  return slashIndex > 0 ? modelId.substring(0, slashIndex) : "unknown";
}

/**
 * Maps a raw gateway model entry to our ChatModel type.
 */
function toModel(entry: { id: string; description?: string }): ChatModel {
  return {
    id: entry.id,
    name: humaniseName(entry.id),
    provider: extractProvider(entry.id),
    description: entry.description ?? "",
  };
}

/**
 * Fetches models from the AI Gateway `/v1/models` endpoint.
 * Results are cached in memory with a 60-minute TTL.
 * Falls back to FALLBACK_MODELS if the gateway is unreachable.
 */
export async function getGatewayModels(): Promise<ChatModel[]> {
  const now = Date.now();

  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(GATEWAY_URL, { headers });

    if (!response.ok) {
      console.error(
        `[gateway] Failed to fetch models: ${response.status} ${response.statusText}`
      );
      return cachedModels ?? FALLBACK_MODELS;
    }

    const body = (await response.json()) as {
      data: Array<{ id: string; description?: string }>;
    };

    const models = body.data.map(toModel);

    // Update cache
    cachedModels = models;
    cacheTimestamp = now;

    return models;
  } catch (error) {
    console.error("[gateway] Error fetching models:", error);
    return cachedModels ?? FALLBACK_MODELS;
  }
}

