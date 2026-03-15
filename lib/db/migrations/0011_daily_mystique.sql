CREATE TABLE IF NOT EXISTS "Copilot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"avatarUrl" text,
	"emoji" varchar(10),
	"systemPrompt" text,
	"type" varchar(20) DEFAULT 'knowledge' NOT NULL,
	"dbConnectionString" text,
	"dbType" varchar(20),
	"sshHost" text,
	"sshPort" integer,
	"sshUsername" text,
	"sshPrivateKey" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CopilotAccess" (
	"copilotId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"grantedBy" uuid NOT NULL,
	"grantedAt" timestamp NOT NULL,
	CONSTRAINT "CopilotAccess_copilotId_userId_pk" PRIMARY KEY("copilotId","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"documentId" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"metadata" json,
	"tokenCount" integer NOT NULL,
	"chunkIndex" integer NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"copilotId" uuid NOT NULL,
	"title" text NOT NULL,
	"fileName" text NOT NULL,
	"mimeType" varchar(100) NOT NULL,
	"storagePath" text NOT NULL,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"chunkCount" integer DEFAULT 0 NOT NULL,
	"uploadedBy" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "copilotId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Copilot" ADD CONSTRAINT "Copilot_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CopilotAccess" ADD CONSTRAINT "CopilotAccess_copilotId_Copilot_id_fk" FOREIGN KEY ("copilotId") REFERENCES "public"."Copilot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CopilotAccess" ADD CONSTRAINT "CopilotAccess_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CopilotAccess" ADD CONSTRAINT "CopilotAccess_grantedBy_User_id_fk" FOREIGN KEY ("grantedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_KnowledgeDocument_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."KnowledgeDocument"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_copilotId_Copilot_id_fk" FOREIGN KEY ("copilotId") REFERENCES "public"."Copilot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_uploadedBy_User_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledgeChunk_embedding_idx" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_copilotId_Copilot_id_fk" FOREIGN KEY ("copilotId") REFERENCES "public"."Copilot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
