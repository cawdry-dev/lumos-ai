import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  foreignKey,
  index,
  integer,
  json,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/** Custom column type for pgvector `vector(N)` columns. */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    const dimensions = (config as { dimensions?: number })?.dimensions ?? 1536;
    return `vector(${dimensions})`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map(Number);
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
});

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  /** @deprecated Legacy column — passwords are now managed by Supabase Auth. Do NOT drop; existing data may reference it. */
  password: varchar("password", { length: 64 }),
  /** Role governing access level — 'admin' or 'editor'. */
  role: varchar("role", { length: 20 }).notNull().default("editor"),
  /** Optional display name shown in the UI. */
  displayName: text("displayName"),
  /** Whether this user is exempt from MFA enrolment (admin-toggled). */
  mfaExempt: boolean("mfaExempt").notNull().default(false),
  /** The user who invited this user, if applicable. */
  invitedBy: uuid("invitedBy"),
  /** Timestamp when the invitation was sent. */
  invitedAt: timestamp("invitedAt"),
  /** Per-user daily cost limit in cents (pence). Null means use role default. */
  dailyCostLimitCents: integer("dailyCostLimitCents"),
  /** Per-user monthly cost limit in cents (pence). Null means use role default. */
  monthlyCostLimitCents: integer("monthlyCostLimitCents"),
  /** Which SSO provider the user signed up with, or null for email+password. */
  ssoProvider: varchar("ssoProvider", { length: 20 }),
  /** User-chosen accent colour hex code, e.g. "#6366f1". */
  accentColour: varchar("accentColour", { length: 7 }),
}, (table) => ({
  invitedByRef: foreignKey({
    columns: [table.invitedBy],
    foreignColumns: [table.id],
  }),
}));

export type User = InferSelectModel<typeof user>;

// ---------------------------------------------------------------------------
// Co-pilot & Knowledge tables
// ---------------------------------------------------------------------------

/** A co-pilot persona that users can chat with. */
export const copilot = pgTable("Copilot", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  /** Display name, e.g. "HR Assistant". */
  name: varchar("name", { length: 100 }).notNull(),
  /** Short blurb shown to users. */
  description: text("description").notNull(),
  /** Uploaded avatar image path. */
  avatarUrl: text("avatarUrl"),
  /** Fallback emoji if no avatar is set. */
  emoji: varchar("emoji", { length: 10 }),
  /** Custom persona instructions for the LLM. */
  systemPrompt: text("systemPrompt"),
  /** Co-pilot type — `knowledge` (RAG) or `data` (SQL). */
  type: varchar("type", { length: 20, enum: ["knowledge", "data"] })
    .notNull()
    .default("knowledge"),
  /** Encrypted database connection string for data co-pilots. */
  dbConnectionString: text("dbConnectionString"),
  /** Database dialect — `postgres` or `mysql`. */
  dbType: varchar("dbType", { length: 20 }),
  /** SSH bastion hostname for tunnelled connections. */
  sshHost: text("sshHost"),
  /** SSH bastion port (defaults to 22). */
  sshPort: integer("sshPort"),
  /** SSH bastion username. */
  sshUsername: text("sshUsername"),
  /** SSH private key in PEM format (encrypted at rest). */
  sshPrivateKey: text("sshPrivateKey"),
  /** Locked AI model for this co-pilot. When set, users cannot change the model. */
  modelId: varchar("modelId", { length: 255 }),
  /** Whether this co-pilot is available to users. */
  isActive: boolean("isActive").notNull().default(true),
  /** The user who created this co-pilot. */
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Copilot = InferSelectModel<typeof copilot>;

export const chat = pgTable(
  "Chat",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    /** Optional co-pilot that owns this chat session. */
    copilotId: uuid("copilotId"),
    visibility: varchar("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("private"),
  },
  (table) => ({
    copilotRef: foreignKey({
      columns: [table.copilotId],
      foreignColumns: [copilot.id],
    }),
  })
);

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet", "chart"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

/** Pending invitations sent to prospective users. */
export const invitation = pgTable("Invitation", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  /** Role the invitee will receive upon acceptance. */
  role: varchar("role", { length: 20 }).notNull().default("editor"),
  /** Optional display name pre-filled by the admin. */
  displayName: text("displayName"),
  /** Unique token used to accept the invitation. */
  token: varchar("token", { length: 64 }).notNull().unique(),
  /** The admin who created this invitation. */
  invitedBy: uuid("invitedBy")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  /** Timestamp when the invitation was accepted; null if still pending. */
  acceptedAt: timestamp("acceptedAt"),
  /** Expiry timestamp after which the invitation is no longer valid. */
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Invitation = InferSelectModel<typeof invitation>;

/** AI models that have been enabled for use in the application. */
export const enabledModel = pgTable("EnabledModel", {
  /** The model identifier string, e.g. "openai/gpt-4.1-mini". */
  id: varchar("id", { length: 255 }).primaryKey().notNull(),
  enabledAt: timestamp("enabledAt").notNull(),
  /** The admin who enabled this model. */
  enabledBy: uuid("enabledBy")
    .notNull()
    .references(() => user.id),
});

export type EnabledModel = InferSelectModel<typeof enabledModel>;

/** Join table granting individual users access to a co-pilot. */
export const copilotAccess = pgTable(
  "CopilotAccess",
  {
    copilotId: uuid("copilotId")
      .notNull()
      .references(() => copilot.id),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    /** The admin who granted access. */
    grantedBy: uuid("grantedBy")
      .notNull()
      .references(() => user.id),
    grantedAt: timestamp("grantedAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.copilotId, table.userId] }),
  })
);

export type CopilotAccess = InferSelectModel<typeof copilotAccess>;

/** An uploaded document attached to a co-pilot's knowledge base. */
export const knowledgeDocument = pgTable("KnowledgeDocument", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  copilotId: uuid("copilotId")
    .notNull()
    .references(() => copilot.id),
  title: text("title").notNull(),
  fileName: text("fileName").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  /** Supabase Storage path for the original file. */
  storagePath: text("storagePath").notNull(),
  /** Processing status: `processing`, `ready`, or `error`. */
  status: varchar("status", {
    length: 20,
    enum: ["processing", "ready", "error"],
  })
    .notNull()
    .default("processing"),
  /** Number of chunks generated from this document. */
  chunkCount: integer("chunkCount").notNull().default(0),
  /** The user who uploaded this document. */
  uploadedBy: uuid("uploadedBy")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type KnowledgeDocument = InferSelectModel<typeof knowledgeDocument>;

/** An individual text chunk with its embedding vector. */
export const knowledgeChunk = pgTable(
  "KnowledgeChunk",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    documentId: uuid("documentId")
      .notNull()
      .references(() => knowledgeDocument.id),
    content: text("content").notNull(),
    /** pgvector embedding (1536 dimensions for OpenAI ada-002). */
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    /** Arbitrary metadata — page number, heading, etc. */
    metadata: json("metadata"),
    tokenCount: integer("tokenCount").notNull(),
    chunkIndex: integer("chunkIndex").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    /** HNSW index for fast cosine-similarity searches. */
    embeddingIdx: index("knowledgeChunk_embedding_idx").using(
      "hnsw",
      sql`${table.embedding} vector_cosine_ops`,
    ),
  })
);

export type KnowledgeChunk = InferSelectModel<typeof knowledgeChunk>;

// ---------------------------------------------------------------------------
// Token usage & model pricing tables
// ---------------------------------------------------------------------------

/** Records token usage for every AI call (chat, embedding, artifact, title, suggestion). */
export const tokenUsage = pgTable(
  "TokenUsage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    /** Null for non-chat usage such as embeddings or ingestion. */
    chatId: uuid("chatId"),
    /** Optional co-pilot that triggered this usage. */
    copilotId: uuid("copilotId"),
    /** Model identifier, e.g. "openai/gpt-4.1-mini". */
    modelId: varchar("modelId", { length: 100 }).notNull(),
    promptTokens: integer("promptTokens").notNull().default(0),
    completionTokens: integer("completionTokens").notNull().default(0),
    totalTokens: integer("totalTokens").notNull().default(0),
    /** Estimated cost in cents (pence), calculated from model pricing. */
    estimatedCostCents: integer("estimatedCostCents").notNull().default(0),
    /** The type of AI call that generated this usage. */
    usageType: varchar("usageType", {
      length: 20,
      enum: ["chat", "embedding", "artifact", "title", "suggestion", "whisper", "tts"],
    }).notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    userIdx: index("tokenUsage_userId_idx").on(table.userId),
    createdAtIdx: index("tokenUsage_createdAt_idx").on(table.createdAt),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    copilotRef: foreignKey({
      columns: [table.copilotId],
      foreignColumns: [copilot.id],
    }),
  })
);

export type TokenUsage = InferSelectModel<typeof tokenUsage>;

/** Admin-editable pricing table for AI models. */
export const modelPricing = pgTable("ModelPricing", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  /** Glob or exact match pattern, e.g. "openai/gpt-4.1-*". */
  modelPattern: varchar("modelPattern", { length: 200 }).notNull(),
  /** Price in cents per 1K prompt tokens. */
  promptPricePer1kTokens: numeric("promptPricePer1kTokens").notNull(),
  /** Price in cents per 1K completion tokens. */
  completionPricePer1kTokens: numeric("completionPricePer1kTokens").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type ModelPricing = InferSelectModel<typeof modelPricing>;

// ---------------------------------------------------------------------------
// SSO domain whitelist
// ---------------------------------------------------------------------------

/** Whitelisted email domains that allow automatic SSO user provisioning. */
export const allowedDomain = pgTable("AllowedDomain", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  /** Email domain, e.g. "yourcompany.com". */
  domain: varchar("domain", { length: 255 }).notNull(),
  /** Default role assigned to auto-provisioned users. */
  defaultRole: varchar("defaultRole", { length: 20 }).notNull().default("editor"),
  /** Restrict to a specific SSO provider, or allow any. */
  ssoProvider: varchar("ssoProvider", { length: 20 }).notNull().default("any"),
  /** The admin who created this whitelist entry. */
  createdBy: uuid("createdBy")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
});

export type AllowedDomain = InferSelectModel<typeof allowedDomain>;