/**
 * Default pricing for known models (cents per 1K tokens).
 * Used to auto-create pricing rules when an admin enables a model.
 *
 * Prices reflect approximate March 2025 public API pricing.
 */

type PricingEntry = {
  promptPricePer1kTokens: string;
  completionPricePer1kTokens: string;
};

/**
 * Exact model ID → default pricing.
 * Keys should match the model IDs used in the gateway / FALLBACK_MODELS.
 */
export const DEFAULT_MODEL_PRICING: Record<string, PricingEntry> = {
  // OpenAI
  "openai/gpt-4.1": { promptPricePer1kTokens: "0.2", completionPricePer1kTokens: "0.8" },
  "openai/gpt-4.1-mini": { promptPricePer1kTokens: "0.04", completionPricePer1kTokens: "0.16" },
  "openai/gpt-4.1-nano": { promptPricePer1kTokens: "0.01", completionPricePer1kTokens: "0.04" },
  "openai/gpt-5-mini": { promptPricePer1kTokens: "0.125", completionPricePer1kTokens: "0.5" },
  "openai/text-embedding-3-small": { promptPricePer1kTokens: "0.002", completionPricePer1kTokens: "0" },

  // Anthropic
  "anthropic/claude-sonnet-4-20250514": { promptPricePer1kTokens: "0.3", completionPricePer1kTokens: "1.5" },
  "anthropic/claude-haiku-4.5": { promptPricePer1kTokens: "0.08", completionPricePer1kTokens: "0.4" },
  "anthropic/claude-haiku-3.5": { promptPricePer1kTokens: "0.08", completionPricePer1kTokens: "0.4" },
  "anthropic/claude-3.7-sonnet-thinking": { promptPricePer1kTokens: "0.3", completionPricePer1kTokens: "1.5" },

  // Google
  "google/gemini-2.5-pro": { promptPricePer1kTokens: "0.125", completionPricePer1kTokens: "1.0" },
  "google/gemini-2.5-flash": { promptPricePer1kTokens: "0.015", completionPricePer1kTokens: "0.06" },
  "google/gemini-2.5-flash-lite": { promptPricePer1kTokens: "0.008", completionPricePer1kTokens: "0.03" },
  "google/gemini-3-pro-preview": { promptPricePer1kTokens: "0.15", completionPricePer1kTokens: "1.0" },

  // xAI
  "xai/grok-4.1-fast-non-reasoning": { promptPricePer1kTokens: "0.3", completionPricePer1kTokens: "1.0" },
  "xai/grok-code-fast-1-thinking": { promptPricePer1kTokens: "0.3", completionPricePer1kTokens: "1.0" },
};

/**
 * Provider-level wildcard fallback pricing.
 * Used when no exact match exists in DEFAULT_MODEL_PRICING.
 * The key is the provider prefix (e.g. "openai"), and the pattern
 * created will be "openai/*".
 */
export const PROVIDER_WILDCARD_PRICING: Record<string, PricingEntry> = {
  openai: { promptPricePer1kTokens: "0.1", completionPricePer1kTokens: "0.4" },
  anthropic: { promptPricePer1kTokens: "0.15", completionPricePer1kTokens: "0.75" },
  google: { promptPricePer1kTokens: "0.05", completionPricePer1kTokens: "0.2" },
  xai: { promptPricePer1kTokens: "0.3", completionPricePer1kTokens: "1.0" },
};

/**
 * Extracts the provider prefix from a model ID.
 * e.g. "openai/gpt-4.1-mini" → "openai"
 */
export function getProviderFromModelId(modelId: string): string | null {
  const slashIndex = modelId.indexOf("/");
  return slashIndex > 0 ? modelId.slice(0, slashIndex) : null;
}

