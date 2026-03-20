CREATE TABLE IF NOT EXISTS "Organisation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"billingModel" varchar(20) DEFAULT 'per_token' NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrganisationMember" (
	"orgId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp NOT NULL,
	CONSTRAINT "OrganisationMember_orgId_userId_pk" PRIMARY KEY("orgId","userId")
);
--> statement-breakpoint
ALTER TABLE "AllowedDomain" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "Copilot" ADD COLUMN "isGlobal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Copilot" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "CopilotAccess" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "EnabledModel" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "Invitation" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "KnowledgeChunk" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "KnowledgeDocument" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "Memory" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "ModelPricing" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "TokenUsage" ADD COLUMN "orgId" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "isGlobalAdmin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrganisationMember" ADD CONSTRAINT "OrganisationMember_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organisation_slug_idx" ON "Organisation" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organisationMember_userId_idx" ON "OrganisationMember" USING btree ("userId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AllowedDomain" ADD CONSTRAINT "AllowedDomain_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Copilot" ADD CONSTRAINT "Copilot_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CopilotAccess" ADD CONSTRAINT "CopilotAccess_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EnabledModel" ADD CONSTRAINT "EnabledModel_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Memory" ADD CONSTRAINT "Memory_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ModelPricing" ADD CONSTRAINT "ModelPricing_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TokenUsage" ADD CONSTRAINT "TokenUsage_orgId_Organisation_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."Organisation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "allowedDomain_orgId_idx" ON "AllowedDomain" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_orgId_idx" ON "Chat" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilot_orgId_idx" ON "Copilot" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "copilotAccess_orgId_idx" ON "CopilotAccess" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_orgId_idx" ON "Document" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enabledModel_orgId_idx" ON "EnabledModel" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invitation_orgId_idx" ON "Invitation" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledgeChunk_orgId_idx" ON "KnowledgeChunk" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledgeDocument_orgId_idx" ON "KnowledgeDocument" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memory_orgId_idx" ON "Memory" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "modelPricing_orgId_idx" ON "ModelPricing" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tokenUsage_orgId_idx" ON "TokenUsage" USING btree ("orgId");