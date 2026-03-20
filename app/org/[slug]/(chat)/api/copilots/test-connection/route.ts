import { auth } from "@/lib/supabase/auth";
import { testConnection, type DbType, type SshConfig } from "@/lib/rag/db-connector";
import { ChatbotError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/copilots/test-connection
 *
 * Tests database connectivity for a data co-pilot configuration.
 * Admin-only (org-scoped).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const session = await auth(slug);

  if (!session?.user || !session?.org) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  if (session.org.role !== "admin" && session.org.role !== "owner") {
    return Response.json(
      { error: "Forbidden. Only admins can test connections." },
      { status: 403 },
    );
  }

  let body: {
    dbType?: string;
    dbConnectionString?: string;
    sshHost?: string | null;
    sshPort?: number | null;
    sshUsername?: string | null;
    sshPrivateKey?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.dbConnectionString) {
    return Response.json({ error: "Connection string is required." }, { status: 400 });
  }

  if (!body.dbType || !["postgres", "mysql"].includes(body.dbType)) {
    return Response.json({ error: "dbType must be 'postgres' or 'mysql'." }, { status: 400 });
  }

  const sshConfig: SshConfig | undefined =
    body.sshHost && body.sshUsername && body.sshPrivateKey
      ? {
          host: body.sshHost,
          port: body.sshPort ?? 22,
          username: body.sshUsername,
          privateKey: body.sshPrivateKey,
        }
      : undefined;

  const result = await testConnection({
    dbType: body.dbType as DbType,
    connectionString: body.dbConnectionString,
    ssh: sshConfig,
  });

  return Response.json(result);
}

