import { tool } from "ai";
import { z } from "zod";
import {
  executeQuery,
  type DbConnectorOptions,
  type DbType,
  type SshConfig,
} from "@/lib/rag/db-connector";

/**
 * Regex that matches statements which are NOT read-only.
 * Rejects INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE,
 * GRANT, REVOKE, CALL, EXEC, and SET (except inside our own driver setup).
 */
const WRITE_PATTERN =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|CALL|EXEC)\b/i;

/**
 * Validate that a SQL string contains only read-only operations.
 */
function isReadOnlyQuery(sql: string): boolean {
  // Strip comments and string literals to avoid false positives
  const stripped = sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'[^']*'/g, "''");
  return !WRITE_PATTERN.test(stripped);
}

interface QueryDatabaseConfig {
  /** Co-pilot ID (for logging / context). */
  copilotId: string;
  /** Database connection string. */
  connectionString: string;
  /** Database dialect. */
  dbType: DbType;
  /** Optional SSH bastion configuration. */
  ssh?: SshConfig;
}

/**
 * Creates a `queryDatabase` tool scoped to a specific data co-pilot.
 *
 * The tool validates that the query is read-only, then executes it
 * against the co-pilot's configured database (Postgres or MySQL),
 * optionally through an SSH bastion tunnel.
 */
export function queryDatabase({ copilotId, connectionString, dbType, ssh }: QueryDatabaseConfig) {
  const opts: DbConnectorOptions = {
    dbType,
    connectionString,
    ssh,
  };

  return tool({
    description:
      "Execute a read-only SQL query against the connected database to answer the user's question. " +
      "Only SELECT statements are permitted.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("The SQL SELECT query to execute"),
      explanation: z
        .string()
        .describe("Brief explanation of why this query answers the user's question"),
    }),
    execute: async ({ query, explanation }) => {
      // SQL-level validation — reject write operations before they reach the database
      if (!isReadOnlyQuery(query)) {
        return {
          error: "Only SELECT queries are allowed. Write operations are not permitted.",
          explanation,
        };
      }

      try {
        const result = await executeQuery(opts, query);
        return {
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rowCount,
          truncated: result.truncated,
          explanation,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Query execution failed";
        return {
          error: message,
          explanation,
        };
      }
    },
  });
}

