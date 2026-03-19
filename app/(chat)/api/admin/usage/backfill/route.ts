import { auth } from "@/lib/supabase/auth";
import {
  getActiveModelPricing,
  getZeroCostUsageRows,
  batchUpdateUsageCosts,
} from "@/lib/db/queries";
import { findPricingForModel, calculateCostCents } from "@/lib/ai/usage";
import {
  DEFAULT_MODEL_PRICING,
  PROVIDER_WILDCARD_PRICING,
  getProviderFromModelId,
} from "@/lib/ai/pricing-defaults";
import type { ModelPricing } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 500;

/**
 * POST /api/admin/usage/backfill
 *
 * Recalculates estimatedCostCents for all TokenUsage rows where cost is 0
 * but totalTokens > 0. Uses DB pricing rules first, then falls back to
 * hard-coded default pricing.
 *
 * Returns: { updated: number, skipped: number }
 */
export async function POST() {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can trigger a backfill." },
      { status: 403 },
    );
  }

  try {
    const pricingRules = await getActiveModelPricing();

    let updated = 0;
    let skipped = 0;
    let offset = 0;

    // Process in batches to avoid memory issues
    while (true) {
      const rows = await getZeroCostUsageRows({
        limit: BATCH_SIZE,
        offset,
      });

      if (rows.length === 0) break;

      const updates: { id: string; estimatedCostCents: number }[] = [];

      for (const row of rows) {
        const pricing = resolvePricing(row.modelId, pricingRules);

        if (!pricing) {
          skipped++;
          continue;
        }

        const cost = calculateCostCents(
          row.promptTokens,
          row.completionTokens,
          pricing,
        );

        if (cost > 0) {
          updates.push({ id: row.id, estimatedCostCents: cost });
        } else {
          // Pricing rule exists but calculated cost is still 0 — skip
          skipped++;
        }
      }

      if (updates.length > 0) {
        await batchUpdateUsageCosts(updates);
        updated += updates.length;
      }

      // If we received fewer rows than the batch size we've reached the end
      if (rows.length < BATCH_SIZE) break;

      offset += BATCH_SIZE;
    }

    return Response.json({ updated, skipped });
  } catch (error) {
    console.error("Backfill failed:", error);
    return Response.json(
      { error: "Backfill failed. Check server logs for details." },
      { status: 500 },
    );
  }
}

/**
 * Resolves pricing for a model ID by checking DB rules first, then falling
 * back to hard-coded defaults and provider wildcard pricing.
 */
function resolvePricing(
  modelId: string,
  dbRules: ModelPricing[],
): ModelPricing | null {
  // 1. Try DB pricing rules (exact + glob)
  const dbMatch = findPricingForModel(modelId, dbRules);
  if (dbMatch) return dbMatch;

  // 2. Try hard-coded exact default
  const defaultEntry = DEFAULT_MODEL_PRICING[modelId];
  if (defaultEntry) {
    return {
      id: "",
      modelPattern: modelId,
      promptPricePer1kTokens: defaultEntry.promptPricePer1kTokens,
      completionPricePer1kTokens: defaultEntry.completionPricePer1kTokens,
      isActive: true,
      updatedAt: new Date(),
    } as ModelPricing;
  }

  // 3. Try provider wildcard fallback
  const provider = getProviderFromModelId(modelId);
  if (provider && PROVIDER_WILDCARD_PRICING[provider]) {
    const wildcard = PROVIDER_WILDCARD_PRICING[provider];
    return {
      id: "",
      modelPattern: `${provider}/*`,
      promptPricePer1kTokens: wildcard.promptPricePer1kTokens,
      completionPricePer1kTokens: wildcard.completionPricePer1kTokens,
      isActive: true,
      updatedAt: new Date(),
    } as ModelPricing;
  }

  return null;
}

