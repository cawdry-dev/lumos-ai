import { auth } from "@/lib/supabase/auth";
import { getCopilots, createCopilot } from "@/lib/db/queries";

/**
 * GET /api/copilots
 *
 * Returns all co-pilots. Admin-only.
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
      { error: "Forbidden. Only admins can manage co-pilots." },
      { status: 403 }
    );
  }

  try {
    const copilots = await getCopilots();
    return Response.json({ copilots });
  } catch (error) {
    console.error("Failed to fetch co-pilots:", error);
    return Response.json(
      { error: "Failed to fetch co-pilots." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/copilots
 *
 * Creates a new co-pilot. Admin-only.
 * Accepts { name, description?, emoji?, type, systemPrompt?, dbConnectionString?, isActive? }
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  if (session.user.role !== "admin") {
    return Response.json(
      { error: "Forbidden. Only admins can create co-pilots." },
      { status: 403 }
    );
  }

  let body: {
    name?: string;
    description?: string | null;
    emoji?: string | null;
    type?: string;
    systemPrompt?: string | null;
    dbConnectionString?: string | null;
    dbType?: string | null;
    sshHost?: string | null;
    sshPort?: number | null;
    sshUsername?: string | null;
    sshPrivateKey?: string | null;
    modelId?: string | null;
    isActive?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return Response.json(
      { error: "A valid name is required." },
      { status: 400 }
    );
  }

  if (!body.type || !["knowledge", "data"].includes(body.type)) {
    return Response.json(
      { error: 'Type must be either "knowledge" or "data".' },
      { status: 400 }
    );
  }

  try {
    const created = await createCopilot({
      name: body.name.trim(),
      description: body.description ?? "",
      emoji: body.emoji ?? null,
      type: body.type as "knowledge" | "data",
      systemPrompt: body.systemPrompt ?? null,
      dbConnectionString: body.dbConnectionString ?? null,
      dbType: body.dbType ?? null,
      sshHost: body.sshHost ?? null,
      sshPort: body.sshPort ?? null,
      sshUsername: body.sshUsername ?? null,
      sshPrivateKey: body.sshPrivateKey ?? null,
      modelId: body.modelId ?? null,
      isActive: body.isActive ?? true,
      createdBy: session.user.id,
    });

    return Response.json({ copilot: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create co-pilot:", error);
    return Response.json(
      { error: "Failed to create co-pilot." },
      { status: 500 }
    );
  }
}

