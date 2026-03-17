import { auth } from "@/lib/supabase/auth";
import {
  getEnabledModels,
  enableModel,
  disableModel,
  createModelPricing,
  findPricingRuleByPattern,
} from "@/lib/db/queries";
import { getGatewayModels } from "@/lib/ai/gateway";
import {
  DEFAULT_MODEL_PRICING,
  PROVIDER_WILDCARD_PRICING,
  getProviderFromModelId,
} from "@/lib/ai/pricing-defaults";

/**
 * GET /api/admin/models
 *
 * Returns the list of currently enabled model IDs.
 * Only accessible by users with the "admin" role.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can manage models." },
      { status: 403 }
    );
  }

  try {
    const [models, rows] = await Promise.all([
      getGatewayModels(),
      getEnabledModels(),
    ]);
    const enabledIds = rows.map((row) => row.id);

    return Response.json({ models, enabledModelIds: enabledIds });
  } catch (error) {
    console.error("Failed to fetch enabled models:", error);
    return Response.json(
      { error: "Failed to fetch enabled models." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/models
 *
 * Enables or disables a model.
 * Accepts { modelId: string, enabled: boolean }.
 * Only accessible by users with the "admin" role.
 */
export async function PUT(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can manage models." },
      { status: 403 }
    );
  }

  let body: { modelId?: string; enabled?: boolean };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { modelId, enabled } = body;

  if (!modelId || typeof modelId !== "string") {
    return Response.json(
      { error: "A valid modelId is required." },
      { status: 400 }
    );
  }

  if (typeof enabled !== "boolean") {
    return Response.json(
      { error: "The enabled field must be a boolean." },
      { status: 400 }
    );
  }

  // Only allow toggling models that exist in the gateway list
  const gatewayModels = await getGatewayModels();
  const gatewayIds = new Set(gatewayModels.map((m) => m.id));
  if (!gatewayIds.has(modelId)) {
    return Response.json(
      { error: "Unknown model ID." },
      { status: 400 }
    );
  }

  try {
    if (enabled) {
      await enableModel(modelId, session.user.id);
      await ensurePricingRuleExists(modelId);
    } else {
      await disableModel(modelId);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to update model state:", error);
    return Response.json(
      { error: "Failed to update model state." },
      { status: 500 }
    );
  }
}

/**
 * Ensures a pricing rule exists for the given model.
 * If no exact-match rule exists, creates one from the defaults map.
 * If no default exists, creates a provider-level wildcard rule as fallback.
 */
async function ensurePricingRuleExists(modelId: string): Promise<void> {
  // Check for an exact pricing rule
  const existingExact = await findPricingRuleByPattern(modelId, { activeOnly: true });
  if (existingExact) return;

  // Try to create from the known defaults map
  const defaultPricing = DEFAULT_MODEL_PRICING[modelId];
  if (defaultPricing) {
    await createModelPricing({
      modelPattern: modelId,
      promptPricePer1kTokens: defaultPricing.promptPricePer1kTokens,
      completionPricePer1kTokens: defaultPricing.completionPricePer1kTokens,
    });
    return;
  }

  // Fall back to a provider-level wildcard rule (e.g. "openai/*")
  const provider = getProviderFromModelId(modelId);
  if (!provider) {
    console.warn(
      `[pricing] No pricing rule could be created for model "${modelId}": unknown provider. Usage will be recorded with zero cost.`,
    );
    return;
  }

  const wildcardPattern = `${provider}/*`;
  const existingWildcard = await findPricingRuleByPattern(wildcardPattern, { activeOnly: true });
  if (existingWildcard) return;

  const wildcardPricing = PROVIDER_WILDCARD_PRICING[provider];
  if (!wildcardPricing) {
    console.warn(
      `[pricing] No pricing rule could be created for model "${modelId}": no default pricing for provider "${provider}". Usage will be recorded with zero cost.`,
    );
    return;
  }

  await createModelPricing({
    modelPattern: wildcardPattern,
    promptPricePer1kTokens: wildcardPricing.promptPricePer1kTokens,
    completionPricePer1kTokens: wildcardPricing.completionPricePer1kTokens,
  });
}

