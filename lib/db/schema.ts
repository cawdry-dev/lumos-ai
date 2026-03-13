import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  /** @deprecated Legacy column — passwords are now managed by Supabase Auth. Do NOT drop; existing data may reference it. */
  password: varchar("password", { length: 64 }),
  /** Role governing access level — 'admin' or 'editor'. */
  role: varchar("role", { length: 20 }).notNull().default("editor"),
  /** Optional display name shown in the UI. */
  displayName: text("displayName"),
  /** The user who invited this user, if applicable. */
  invitedBy: uuid("invitedBy"),
  /** Timestamp when the invitation was sent. */
  invitedAt: timestamp("invitedAt"),
}, (table) => ({
  invitedByRef: foreignKey({
    columns: [table.invitedBy],
    foreignColumns: [table.id],
  }),
}));

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

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
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
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
