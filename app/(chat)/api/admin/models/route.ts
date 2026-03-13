import { auth } from "@/lib/supabase/auth";
import {
  getEnabledModels,
  enableModel,
  disableModel,
} from "@/lib/db/queries";
import { allowedModelIds } from "@/lib/ai/models";

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
    const rows = await getEnabledModels();
    const enabledIds = rows.map((row) => row.id);

    return Response.json({ enabledModelIds: enabledIds });
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

  // Only allow toggling models that exist in our curated list
  if (!allowedModelIds.has(modelId)) {
    return Response.json(
      { error: "Unknown model ID." },
      { status: 400 }
    );
  }

  try {
    if (enabled) {
      await enableModel(modelId, session.user.id);
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

