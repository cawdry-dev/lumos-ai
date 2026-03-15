import "server-only";

import type { UserType } from "@/lib/supabase/auth";
import { entitlementsByUserType } from "./entitlements";
import {
  getActiveModelPricing,
  getUserCostForPeriod,
  getUserCostLimits,
  insertTokenUsage,
} from "@/lib/db/queries";
import type { ModelPricing } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Model pricing lookup
// ---------------------------------------------------------------------------

/**
 * Matches a model ID against the active pricing rules.
 * Supports exact matches and simple glob patterns (trailing `*`).
 */
export function findPricingForModel(
  modelId: string,
  pricingRules: ModelPricing[],
): ModelPricing | null {
  // Prefer exact match first
  const exact = pricingRules.find(
    (r) => r.modelPattern === modelId && r.isActive,
  );
  if (exact) return exact;

  // Fall back to glob (trailing wildcard only, e.g. "openai/gpt-4.1-*")
  for (const rule of pricingRules) {
    if (!rule.isActive) continue;
    if (rule.modelPattern.endsWith("*")) {
      const prefix = rule.modelPattern.slice(0, -1);
      if (modelId.startsWith(prefix)) return rule;
    }
  }

  return null;
}

/**
 * Calculates the estimated cost in cents from token counts and a pricing rule.
 */
export function calculateCostCents(
  promptTokens: number,
  completionTokens: number,
  pricing: ModelPricing | null,
): number {
  if (!pricing) return 0;

  const promptCost =
    (promptTokens / 1000) * Number(pricing.promptPricePer1kTokens);
  const completionCost =
    (completionTokens / 1000) * Number(pricing.completionPricePer1kTokens);

  return Math.round(promptCost + completionCost);
}

// ---------------------------------------------------------------------------
// Usage recording
// ---------------------------------------------------------------------------

/**
 * Records token usage for an AI call. Looks up pricing automatically.
 * Safe to call fire-and-forget — errors are logged but not thrown.
 */
export async function recordUsage(params: {
  userId: string;
  chatId?: string | null;
  copilotId?: string | null;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  usageType: "chat" | "embedding" | "artifact" | "title" | "suggestion" | "whisper" | "tts";
}): Promise<void> {
  try {
    const pricingRules = await getActiveModelPricing();
    const pricing = findPricingForModel(params.modelId, pricingRules);
    const totalTokens = params.promptTokens + params.completionTokens;
    const estimatedCostCents = calculateCostCents(
      params.promptTokens,
      params.completionTokens,
      pricing,
    );

    await insertTokenUsage({
      userId: params.userId,
      chatId: params.chatId ?? null,
      copilotId: params.copilotId ?? null,
      modelId: params.modelId,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens,
      estimatedCostCents,
      usageType: params.usageType,
    });
  } catch (error) {
    console.error("[usage] Failed to record token usage:", error);
  }
}

// ---------------------------------------------------------------------------
// Cost limit checking
// ---------------------------------------------------------------------------

/** Returns the start of the current UTC day. */
function startOfDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Returns the start of the current UTC month. */
function startOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Checks whether a user has exceeded their daily or monthly cost limit.
 * Returns `null` if within limits, or a descriptive string if blocked.
 */
export async function checkCostLimits(
  userId: string,
  userRole: UserType,
): Promise<string | null> {
  const userLimits = await getUserCostLimits(userId);
  const roleDefaults = entitlementsByUserType[userRole];

  const dailyLimit = userLimits?.dailyCostLimitCents ?? roleDefaults.dailyCostLimitCents;
  const monthlyLimit = userLimits?.monthlyCostLimitCents ?? roleDefaults.monthlyCostLimitCents;

  // Unlimited — no check needed
  if (dailyLimit === null && monthlyLimit === null) return null;

  const now = new Date();

  if (dailyLimit !== null) {
    const dayCost = await getUserCostForPeriod({ userId, from: startOfDay(), to: now });
    if (dayCost.totalCostCents >= dailyLimit) {
      return "daily";
    }
  }

  if (monthlyLimit !== null) {
    const monthCost = await getUserCostForPeriod({ userId, from: startOfMonth(), to: now });
    if (monthCost.totalCostCents >= monthlyLimit) {
      return "monthly";
    }
  }

  return null;
}

