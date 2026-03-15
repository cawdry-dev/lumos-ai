/**
 * Multi-dialect database connection manager with SSH tunnel support.
 *
 * Supports Postgres (`pg`) and MySQL (`mysql2`) connections, optionally
 * tunnelled through an SSH bastion host using the `ssh2` library.
 */

import { Client as SshClient } from "ssh2";
import net from "node:net";
import pg from "postgres";
import mysql from "mysql2/promise";

export type DbType = "postgres" | "mysql";

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export interface DbConnectorOptions {
  dbType: DbType;
  connectionString: string;
  ssh?: SshConfig;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

const ROW_LIMIT = 1000;
const STATEMENT_TIMEOUT_MS = 10_000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

interface PoolEntry {
  dbType: DbType;
  pgSql?: ReturnType<typeof pg>;
  mysqlPool?: mysql.Pool;
  sshClient?: SshClient;
  tunnelServer?: net.Server;
  lastUsed: number;
}

const pools = new Map<string, PoolEntry>();
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of pools) {
      if (now - entry.lastUsed > IDLE_TIMEOUT_MS) {
        void destroyEntry(entry);
        pools.delete(key);
      }
    }
    if (pools.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 60_000);
}

async function destroyEntry(entry: PoolEntry) {
  try {
    if (entry.pgSql) await entry.pgSql.end();
    if (entry.mysqlPool) await entry.mysqlPool.end();
    if (entry.tunnelServer) entry.tunnelServer.close();
    if (entry.sshClient) entry.sshClient.end();
  } catch { /* swallow cleanup errors */ }
}

function createSshTunnel(
  cfg: SshConfig,
  targetHost: string,
  targetPort: number,
): Promise<{ localPort: number; sshClient: SshClient; server: net.Server }> {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    ssh.on("ready", () => {
      const server = net.createServer((sock) => {
        ssh.forwardOut(
          sock.remoteAddress ?? "127.0.0.1",
          sock.remotePort ?? 0,
          targetHost,
          targetPort,
          (err, stream) => {
            if (err) { sock.end(); return; }
            sock.pipe(stream).pipe(sock);
          },
        );
      });
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as net.AddressInfo;
        resolve({ localPort: addr.port, sshClient: ssh, server });
      });
    });
    ssh.on("error", reject);
    ssh.connect({
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      privateKey: cfg.privateKey,
    });
  });
}

function parseHostPort(connStr: string): { host: string; port: number } {
  try {
    const url = new URL(connStr);
    const defaultPort = connStr.startsWith("mysql") ? 3306 : 5432;
    return { host: url.hostname, port: url.port ? Number(url.port) : defaultPort };
  } catch {
    return { host: "127.0.0.1", port: 5432 };
  }
}

function replaceHostPort(connStr: string, newHost: string, newPort: number): string {
  try {
    const url = new URL(connStr);
    url.hostname = newHost;
    url.port = String(newPort);
    return url.toString();
  } catch {
    return connStr;
  }
}

async function getOrCreatePool(key: string, opts: DbConnectorOptions): Promise<PoolEntry> {
  const existing = pools.get(key);
  if (existing) { existing.lastUsed = Date.now(); return existing; }

  let connStr = opts.connectionString;
  let sshClient: SshClient | undefined;
  let tunnelServer: net.Server | undefined;

  if (opts.ssh) {
    const { host, port } = parseHostPort(connStr);
    const tunnel = await createSshTunnel(opts.ssh, host, port);
    sshClient = tunnel.sshClient;
    tunnelServer = tunnel.server;
    connStr = replaceHostPort(connStr, "127.0.0.1", tunnel.localPort);
  }

  const entry: PoolEntry = { dbType: opts.dbType, sshClient, tunnelServer, lastUsed: Date.now() };
  if (opts.dbType === "postgres") {
    entry.pgSql = pg(connStr, { max: 2, idle_timeout: 60, connect_timeout: 10 });
  } else {
    entry.mysqlPool = mysql.createPool({ uri: connStr, connectionLimit: 2, connectTimeout: 10_000 });
  }
  pools.set(key, entry);
  startCleanupTimer();
  return entry;
}

/**
 * Execute a read-only SQL query against the configured database.
 *
 * Enforces read-only mode at connection level, statement timeout (10 s),
 * and row limit (1 000 rows).
 */
export async function executeQuery(
  opts: DbConnectorOptions,
  query: string,
): Promise<QueryResult> {
  const cacheKey = `${opts.dbType}:${opts.connectionString}:${opts.ssh?.host ?? "direct"}`;
  const pool = await getOrCreatePool(cacheKey, opts);

  if (pool.dbType === "postgres") {
    const sql = pool.pgSql!;
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
      await tx.unsafe("SET LOCAL default_transaction_read_only = on");
      return tx.unsafe(query);
    });
    const limited = rows.slice(0, ROW_LIMIT);
    const columns = limited.length > 0 ? Object.keys(limited[0]) : [];
    return { columns, rows: limited as Record<string, unknown>[], rowCount: limited.length, truncated: rows.length > ROW_LIMIT };
  }

  // MySQL
  const conn = await pool.mysqlPool!.getConnection();
  try {
    await conn.query("SET SESSION TRANSACTION READ ONLY");
    await conn.query(`SET SESSION max_execution_time = ${STATEMENT_TIMEOUT_MS}`);
    const [rawRows, fields] = await conn.query(query);
    const allRows = Array.isArray(rawRows) ? rawRows : [rawRows];
    const limited = allRows.slice(0, ROW_LIMIT) as Record<string, unknown>[];
    const columns = fields && Array.isArray(fields)
      ? (fields as mysql.FieldPacket[]).map((f) => f.name)
      : limited.length > 0 ? Object.keys(limited[0]) : [];
    return { columns, rows: limited, rowCount: limited.length, truncated: allRows.length > ROW_LIMIT };
  } finally {
    conn.release();
  }
}

/** Test database connectivity. */
export async function testConnection(
  opts: DbConnectorOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    await executeQuery(opts, "SELECT 1 AS ok");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown connection error" };
  }
}

/** Tear down all pooled connections and SSH tunnels. */
export async function destroyAllPools() {
  for (const [key, entry] of pools) {
    await destroyEntry(entry);
    pools.delete(key);
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

