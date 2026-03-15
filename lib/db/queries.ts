import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  allowedDomain,
  type AllowedDomain,
  type Chat,
  chat,
  copilot,
  type Copilot,
  copilotAccess,
  type DBMessage,
  document,
  enabledModel,
  invitation,
  knowledgeChunk,
  knowledgeDocument,
  type KnowledgeDocument,
  message,
  modelPricing,
  type ModelPricing,
  type Suggestion,
  stream,
  suggestion,
  tokenUsage,
  type TokenUsage,
  type User,
  user,
  vote,
} from "./schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function saveChat({
  id,
  userId,
  title,
  visibility,
  copilotId,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  copilotId?: string | null;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      ...(copilotId ? { copilotId } : {}),
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

/** A chat row enriched with its co-pilot's display info. */
export type ChatWithCopilot = Chat & {
  copilotName: string | null;
  copilotEmoji: string | null;
};

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select({
          id: chat.id,
          createdAt: chat.createdAt,
          title: chat.title,
          userId: chat.userId,
          copilotId: chat.copilotId,
          visibility: chat.visibility,
          copilotName: copilot.name,
          copilotEmoji: copilot.emoji,
        })
        .from(chat)
        .leftJoin(copilot, eq(chat.copilotId, copilot.id))
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: ChatWithCopilot[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update title for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}


/** Returns the total number of users in the User table. */
export async function getUserCount(): Promise<number> {
  try {
    const [result] = await db
      .select({ count: count(user.id) })
      .from(user)
      .execute();

    return result?.count ?? 0;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user count"
    );
  }
}

/** Creates a user profile row in the User table. */
export async function createProfile({
  id,
  email,
  role,
  invitedBy,
  ssoProvider,
  displayName,
}: {
  id: string;
  email: string;
  role: string;
  invitedBy?: string | null;
  ssoProvider?: string | null;
  displayName?: string | null;
}) {
  try {
    return await db.insert(user).values({
      id,
      email,
      role,
      invitedBy: invitedBy ?? undefined,
      invitedAt: invitedBy ? new Date() : undefined,
      ssoProvider: ssoProvider ?? undefined,
      displayName: displayName ?? undefined,
    });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create user profile"
    );
  }
}

/** Retrieves a user profile by ID, including role and display name. */
export async function getProfileById(
  id: string
): Promise<User | null> {
  try {
    const [profile] = await db
      .select()
      .from(user)
      .where(eq(user.id, id));

    return profile ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get profile by id"
    );
  }
}

/** Creates a new invitation record in the database. */
export async function createInvitation({
  email,
  role,
  invitedBy,
  token,
  expiresAt,
  displayName,
}: {
  email: string;
  role: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  displayName?: string | null;
}) {
  try {
    const [created] = await db
      .insert(invitation)
      .values({
        email,
        role,
        invitedBy,
        token,
        createdAt: new Date(),
        expiresAt,
        displayName: displayName ?? undefined,
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create invitation"
    );
  }
}

/**
 * Retrieves a valid invitation by token.
 * Returns null if the token is expired or already accepted.
 */
export async function getInvitationByToken(token: string) {
  try {
    const [inv] = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.token, token),
          isNull(invitation.acceptedAt),
          gt(invitation.expiresAt, new Date())
        )
      );

    return inv ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get invitation by token"
    );
  }
}

/** Returns all enabled model rows from the EnabledModel table. */
export async function getEnabledModels() {
  try {
    return await db.select().from(enabledModel);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get enabled models"
    );
  }
}

/** Enables a model by upserting into the EnabledModel table. */
export async function enableModel(id: string, userId: string) {
  try {
    return await db
      .insert(enabledModel)
      .values({ id, enabledAt: new Date(), enabledBy: userId })
      .onConflictDoNothing();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to enable model"
    );
  }
}

/** Disables a model by removing it from the EnabledModel table. */
export async function disableModel(id: string) {
  try {
    return await db
      .delete(enabledModel)
      .where(eq(enabledModel.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to disable model"
    );
  }
}

/** Marks an invitation as accepted by setting acceptedAt to now. */
export async function markInvitationAccepted(token: string) {
  try {
    return await db
      .update(invitation)
      .set({ acceptedAt: new Date() })
      .where(eq(invitation.token, token));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to mark invitation as accepted"
    );
  }
}

/** Returns all users ordered by email. */
export async function getAllUsers(): Promise<User[]> {
  try {
    return await db.select().from(user).orderBy(asc(user.email));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get all users");
  }
}

/** Updates a user's role. */
export async function updateUserRole(id: string, role: string) {
  try {
    const [updated] = await db
      .update(user)
      .set({ role })
      .where(eq(user.id, id))
      .returning();

    return updated;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update user role"
    );
  }
}

/** Returns pending invitations (not accepted, not expired), ordered by createdAt desc. */
export async function getPendingInvitations() {
  try {
    return await db
      .select()
      .from(invitation)
      .where(
        and(
          isNull(invitation.acceptedAt),
          gt(invitation.expiresAt, new Date())
        )
      )
      .orderBy(desc(invitation.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get pending invitations"
    );
  }
}

/** Deletes an invitation by ID. */
export async function revokeInvitation(id: string) {
  try {
    return await db
      .delete(invitation)
      .where(eq(invitation.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to revoke invitation"
    );
  }
}

// ---------------------------------------------------------------------------
// Co-pilot queries
// ---------------------------------------------------------------------------

/** Returns all co-pilots ordered by name. */
export async function getCopilots() {
  try {
    return await db.select().from(copilot).orderBy(asc(copilot.name));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get co-pilots");
  }
}

/** Returns a single co-pilot by ID. */
export async function getCopilotById(id: string) {
  try {
    const [row] = await db.select().from(copilot).where(eq(copilot.id, id));
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get co-pilot");
  }
}

/** Creates a new co-pilot and returns it. */
export async function createCopilot(values: {
  name: string;
  description: string;
  emoji: string | null;
  type: "knowledge" | "data";
  systemPrompt: string | null;
  dbConnectionString: string | null;
  dbType: string | null;
  sshHost: string | null;
  sshPort: number | null;
  sshUsername: string | null;
  sshPrivateKey: string | null;
  isActive: boolean;
  createdBy: string;
}) {
  try {
    const [created] = await db
      .insert(copilot)
      .values({
        ...values,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create co-pilot");
  }
}

/** Updates a co-pilot by ID and returns it. */
export async function updateCopilot(
  id: string,
  values: {
    name?: string;
    description?: string;
    emoji?: string | null;
    type?: "knowledge" | "data";
    systemPrompt?: string | null;
    dbConnectionString?: string | null;
    dbType?: string | null;
    sshHost?: string | null;
    sshPort?: number | null;
    sshUsername?: string | null;
    sshPrivateKey?: string | null;
    isActive?: boolean;
  }
) {
  try {
    const [updated] = await db
      .update(copilot)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(copilot.id, id))
      .returning();
    return updated ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update co-pilot");
  }
}

/** Deletes a co-pilot (and cascading access rows) by ID. */
export async function deleteCopilot(id: string) {
  try {
    await db.delete(copilotAccess).where(eq(copilotAccess.copilotId, id));
    const [deleted] = await db
      .delete(copilot)
      .where(eq(copilot.id, id))
      .returning();
    return deleted ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to delete co-pilot");
  }
}

/**
 * Returns all active co-pilots that a user has access to.
 *
 * A co-pilot is accessible when either:
 * - It has no rows in `copilotAccess` (open to everyone), OR
 * - The user has an explicit `copilotAccess` row.
 */
export async function getAvailableCopilots(userId: string): Promise<Copilot[]> {
  try {
    // Sub-query: co-pilot IDs that have at least one access row
    const restricted = db
      .select({ copilotId: copilotAccess.copilotId })
      .from(copilotAccess)
      .groupBy(copilotAccess.copilotId);

    // Sub-query: co-pilot IDs the user is explicitly granted
    const granted = db
      .select({ copilotId: copilotAccess.copilotId })
      .from(copilotAccess)
      .where(eq(copilotAccess.userId, userId));

    const rows = await db
      .select()
      .from(copilot)
      .where(
        and(
          eq(copilot.isActive, true),
          sql`(${copilot.id} NOT IN (${restricted}) OR ${copilot.id} IN (${granted}))`,
        ),
      )
      .orderBy(asc(copilot.name));

    return rows;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get available co-pilots",
    );
  }
}

// ---------------------------------------------------------------------------
// Co-pilot access queries
// ---------------------------------------------------------------------------

/** Returns users who have explicit access to a co-pilot. */
export async function getCopilotAccessUsers(copilotId: string) {
  try {
    return await db
      .select({
        userId: copilotAccess.userId,
        grantedAt: copilotAccess.grantedAt,
        email: user.email,
        displayName: user.displayName,
      })
      .from(copilotAccess)
      .innerJoin(user, eq(copilotAccess.userId, user.id))
      .where(eq(copilotAccess.copilotId, copilotId))
      .orderBy(asc(user.email));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get co-pilot access users"
    );
  }
}

/** Grants a user access to a co-pilot. */
export async function grantCopilotAccess(
  copilotId: string,
  userId: string,
  grantedBy: string
) {
  try {
    const [row] = await db
      .insert(copilotAccess)
      .values({
        copilotId,
        userId,
        grantedBy,
        grantedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to grant co-pilot access"
    );
  }
}

/** Revokes a user's access to a co-pilot. */
export async function revokeCopilotAccess(copilotId: string, userId: string) {
  try {
    return await db
      .delete(copilotAccess)
      .where(
        and(
          eq(copilotAccess.copilotId, copilotId),
          eq(copilotAccess.userId, userId)
        )
      );
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to revoke co-pilot access"
    );
  }
}

// ---------------------------------------------------------------------------
// Knowledge Document helpers
// ---------------------------------------------------------------------------

/** Returns all documents belonging to a co-pilot. */
export async function getKnowledgeDocuments(copilotId: string): Promise<KnowledgeDocument[]> {
  try {
    return await db
      .select()
      .from(knowledgeDocument)
      .where(eq(knowledgeDocument.copilotId, copilotId))
      .orderBy(desc(knowledgeDocument.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get knowledge documents"
    );
  }
}

/** Returns a single knowledge document by ID. */
export async function getKnowledgeDocumentById(id: string): Promise<KnowledgeDocument | null> {
  try {
    const [doc] = await db
      .select()
      .from(knowledgeDocument)
      .where(eq(knowledgeDocument.id, id));
    return doc ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get knowledge document by id"
    );
  }
}

/** Creates a new knowledge document record. */
export async function createKnowledgeDocument(values: {
  copilotId: string;
  title: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  uploadedBy: string;
}) {
  try {
    const now = new Date();
    const [created] = await db
      .insert(knowledgeDocument)
      .values({
        ...values,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create knowledge document"
    );
  }
}

/** Updates a knowledge document's status and chunk count. */
export async function updateKnowledgeDocumentStatus(
  id: string,
  status: "processing" | "ready" | "error",
  chunkCount?: number
) {
  try {
    const [updated] = await db
      .update(knowledgeDocument)
      .set({
        status,
        ...(chunkCount !== undefined ? { chunkCount } : {}),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeDocument.id, id))
      .returning();
    return updated;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update knowledge document status"
    );
  }
}

/** Deletes a knowledge document and its chunks. */
export async function deleteKnowledgeDocument(id: string) {
  try {
    await db.delete(knowledgeChunk).where(eq(knowledgeChunk.documentId, id));
    const [deleted] = await db
      .delete(knowledgeDocument)
      .where(eq(knowledgeDocument.id, id))
      .returning();
    return deleted;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete knowledge document"
    );
  }
}

// ---------------------------------------------------------------------------
// Knowledge Chunk helpers
// ---------------------------------------------------------------------------

/** Inserts chunks in bulk for a given document. */
export async function insertKnowledgeChunks(
  chunks: {
    documentId: string;
    content: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
    tokenCount: number;
    chunkIndex: number;
  }[]
) {
  try {
    const now = new Date();
    return await db.insert(knowledgeChunk).values(
      chunks.map((c) => ({ ...c, createdAt: now }))
    );
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to insert knowledge chunks"
    );
  }
}

/** Returns all chunks for a given document, ordered by index. */
export async function getKnowledgeChunksByDocumentId(documentId: string) {
  try {
    return await db
      .select()
      .from(knowledgeChunk)
      .where(eq(knowledgeChunk.documentId, documentId))
      .orderBy(asc(knowledgeChunk.chunkIndex));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get knowledge chunks by document id"
    );
  }
}

/** Searches for the most relevant chunks using cosine similarity, scoped to a co-pilot. */
export async function searchKnowledgeChunks(
  copilotId: string,
  embedding: number[],
  limit = 10,
) {
  try {
    const vectorLiteral = `[${embedding.join(",")}]`;

    const rows = await db
      .select({
        id: knowledgeChunk.id,
        documentId: knowledgeChunk.documentId,
        content: knowledgeChunk.content,
        metadata: knowledgeChunk.metadata,
        tokenCount: knowledgeChunk.tokenCount,
        chunkIndex: knowledgeChunk.chunkIndex,
        similarity: sql<number>`1 - (${knowledgeChunk.embedding} <=> ${vectorLiteral}::vector)`.as(
          "similarity",
        ),
      })
      .from(knowledgeChunk)
      .innerJoin(
        knowledgeDocument,
        eq(knowledgeChunk.documentId, knowledgeDocument.id),
      )
      .where(
        and(
          eq(knowledgeDocument.copilotId, copilotId),
          eq(knowledgeDocument.status, "ready"),
        ),
      )
      .orderBy(
        sql`${knowledgeChunk.embedding} <=> ${vectorLiteral}::vector`,
      )
      .limit(limit);

    return rows;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to search knowledge chunks",
    );
  }
}

// ---------------------------------------------------------------------------
// Admin usage & pricing queries
// ---------------------------------------------------------------------------

/** Returns aggregated usage stats for the admin dashboard. */
export async function getUsageStats({
  from,
  to,
}: {
  from: Date;
  to: Date;
}) {
  try {
    const rows = await db
      .select({
        userId: tokenUsage.userId,
        email: user.email,
        displayName: user.displayName,
        modelId: tokenUsage.modelId,
        copilotId: tokenUsage.copilotId,
        copilotName: copilot.name,
        usageType: tokenUsage.usageType,
        totalPromptTokens: sql<number>`COALESCE(SUM(${tokenUsage.promptTokens}), 0)::int`,
        totalCompletionTokens: sql<number>`COALESCE(SUM(${tokenUsage.completionTokens}), 0)::int`,
        totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)::int`,
        totalCostCents: sql<number>`COALESCE(SUM(${tokenUsage.estimatedCostCents}), 0)::int`,
        date: sql<string>`DATE(${tokenUsage.createdAt})`.as("date"),
      })
      .from(tokenUsage)
      .innerJoin(user, eq(tokenUsage.userId, user.id))
      .leftJoin(copilot, eq(tokenUsage.copilotId, copilot.id))
      .where(
        and(
          gte(tokenUsage.createdAt, from),
          lt(tokenUsage.createdAt, to),
        ),
      )
      .groupBy(
        tokenUsage.userId,
        user.email,
        user.displayName,
        tokenUsage.modelId,
        tokenUsage.copilotId,
        copilot.name,
        tokenUsage.usageType,
        sql`DATE(${tokenUsage.createdAt})`,
      );

    return rows;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get usage stats",
    );
  }
}

/** Returns the user's total cost for a given period. */
export async function getUserCostForPeriod({
  userId: uid,
  from,
  to,
}: {
  userId: string;
  from: Date;
  to: Date;
}) {
  try {
    const [row] = await db
      .select({
        totalCostCents: sql<number>`COALESCE(SUM(${tokenUsage.estimatedCostCents}), 0)::int`,
        totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)::int`,
      })
      .from(tokenUsage)
      .where(
        and(
          eq(tokenUsage.userId, uid),
          gte(tokenUsage.createdAt, from),
          lt(tokenUsage.createdAt, to),
        ),
      );

    return row ?? { totalCostCents: 0, totalTokens: 0 };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user cost for period",
    );
  }
}

// ---------------------------------------------------------------------------
// Model pricing queries
// ---------------------------------------------------------------------------

/** Returns all model pricing rules. */
export async function getAllModelPricing() {
  try {
    return await db.select().from(modelPricing).orderBy(asc(modelPricing.modelPattern));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get model pricing",
    );
  }
}

/** Creates a new model pricing rule. */
export async function createModelPricing(data: {
  modelPattern: string;
  promptPricePer1kTokens: string;
  completionPricePer1kTokens: string;
}) {
  try {
    const [row] = await db
      .insert(modelPricing)
      .values({
        modelPattern: data.modelPattern,
        promptPricePer1kTokens: data.promptPricePer1kTokens,
        completionPricePer1kTokens: data.completionPricePer1kTokens,
        updatedAt: new Date(),
      })
      .returning();

    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create model pricing",
    );
  }
}

/** Updates an existing model pricing rule. */
export async function updateModelPricing(
  id: string,
  data: {
    modelPattern?: string;
    promptPricePer1kTokens?: string;
    completionPricePer1kTokens?: string;
    isActive?: boolean;
  },
) {
  try {
    const [row] = await db
      .update(modelPricing)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(modelPricing.id, id))
      .returning();

    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update model pricing",
    );
  }
}

/** Deletes a model pricing rule. */
export async function deleteModelPricing(id: string) {
  try {
    await db.delete(modelPricing).where(eq(modelPricing.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete model pricing",
    );
  }
}

// ---------------------------------------------------------------------------
// User cost limit queries
// ---------------------------------------------------------------------------

/** Gets a user's cost limits (per-user overrides). */
export async function getUserCostLimits(uid: string) {
  try {
    const [row] = await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        dailyCostLimitCents: user.dailyCostLimitCents,
        monthlyCostLimitCents: user.monthlyCostLimitCents,
      })
      .from(user)
      .where(eq(user.id, uid));

    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user cost limits",
    );
  }
}

/** Sets per-user cost limit overrides. Pass null to clear (use role default). */
export async function setUserCostLimits(
  uid: string,
  limits: {
    dailyCostLimitCents: number | null;
    monthlyCostLimitCents: number | null;
  },
) {
  try {
    const [row] = await db
      .update(user)
      .set({
        dailyCostLimitCents: limits.dailyCostLimitCents,
        monthlyCostLimitCents: limits.monthlyCostLimitCents,
      })
      .where(eq(user.id, uid))
      .returning();

    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to set user cost limits",
    );
  }
}

/** Returns all users with their cost limits for the admin user list. */
export async function getAllUsersWithLimits() {
  try {
    return await db
      .select({
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        dailyCostLimitCents: user.dailyCostLimitCents,
        monthlyCostLimitCents: user.monthlyCostLimitCents,
      })
      .from(user)
      .orderBy(asc(user.email));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get users with limits",
    );
  }
}

// ---------------------------------------------------------------------------
// Token usage insert helper
// ---------------------------------------------------------------------------

/** Inserts a single token usage record. */
export async function insertTokenUsage(data: {
  userId: string;
  chatId?: string | null;
  copilotId?: string | null;
  modelId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostCents: number;
  usageType: "chat" | "embedding" | "artifact" | "title" | "suggestion" | "whisper" | "tts";
}) {
  try {
    const [row] = await db
      .insert(tokenUsage)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to insert token usage",
    );
  }
}

/** Returns all active model pricing rules. */
export async function getActiveModelPricing(): Promise<ModelPricing[]> {
  try {
    return await db
      .select()
      .from(modelPricing)
      .where(eq(modelPricing.isActive, true));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get active model pricing",
    );
  }
}

// ---------------------------------------------------------------------------
// MFA exemption helpers
// ---------------------------------------------------------------------------

/** Returns the MFA exemption status for a user. */
export async function getMfaExemptStatus(
  userId: string
): Promise<boolean> {
  try {
    const [row] = await db
      .select({ mfaExempt: user.mfaExempt })
      .from(user)
      .where(eq(user.id, userId));

    return row?.mfaExempt ?? false;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get MFA exempt status"
    );
  }
}

/** Toggles the MFA exemption flag for a user. */
export async function setMfaExempt(
  userId: string,
  exempt: boolean
) {
  try {
    const [updated] = await db
      .update(user)
      .set({ mfaExempt: exempt })
      .where(eq(user.id, userId))
      .returning();

    return updated ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to set MFA exempt status"
    );
  }
}

// ---------------------------------------------------------------------------
// Allowed domain (SSO whitelist) helpers
// ---------------------------------------------------------------------------

/** Returns all whitelisted domains, ordered by domain. */
export async function getAllowedDomains(): Promise<AllowedDomain[]> {
  try {
    return await db
      .select()
      .from(allowedDomain)
      .orderBy(asc(allowedDomain.domain));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get allowed domains",
    );
  }
}

/**
 * Returns a matching allowed domain for a given email domain and SSO provider.
 * Matches entries where ssoProvider is 'any' or matches the given provider.
 */
export async function getAllowedDomainByEmail(
  emailDomain: string,
  provider: string,
): Promise<AllowedDomain | null> {
  try {
    const [row] = await db
      .select()
      .from(allowedDomain)
      .where(
        and(
          eq(allowedDomain.domain, emailDomain.toLowerCase()),
          sql`(${allowedDomain.ssoProvider} = 'any' OR ${allowedDomain.ssoProvider} = ${provider})`,
        ),
      );

    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get allowed domain by email",
    );
  }
}

/** Creates a new allowed domain entry. */
export async function createAllowedDomain(values: {
  domain: string;
  defaultRole: string;
  ssoProvider: string;
  createdBy: string;
}): Promise<AllowedDomain> {
  try {
    const [created] = await db
      .insert(allowedDomain)
      .values({
        domain: values.domain.toLowerCase(),
        defaultRole: values.defaultRole,
        ssoProvider: values.ssoProvider,
        createdBy: values.createdBy,
        createdAt: new Date(),
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create allowed domain",
    );
  }
}

/** Deletes an allowed domain entry by ID. */
export async function deleteAllowedDomain(id: string) {
  try {
    return await db
      .delete(allowedDomain)
      .where(eq(allowedDomain.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete allowed domain",
    );
  }
}