CREATE TABLE IF NOT EXISTS "AllowedDomain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(255) NOT NULL,
	"defaultRole" varchar(20) DEFAULT 'editor' NOT NULL,
	"ssoProvider" varchar(20) DEFAULT 'any' NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ModelPricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelPattern" varchar(200) NOT NULL,
	"promptPricePer1kTokens" numeric NOT NULL,
	"completionPricePer1kTokens" numeric NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TokenUsage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"chatId" uuid,
	"copilotId" uuid,
	"modelId" varchar(100) NOT NULL,
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"estimatedCostCents" integer DEFAULT 0 NOT NULL,
	"usageType" varchar(20) NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mfaExempt" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "dailyCostLimitCents" integer;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "monthlyCostLimitCents" integer;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "ssoProvider" varchar(20);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AllowedDomain" ADD CONSTRAINT "AllowedDomain_createdBy_User_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TokenUsage" ADD CONSTRAINT "TokenUsage_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TokenUsage" ADD CONSTRAINT "TokenUsage_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TokenUsage" ADD CONSTRAINT "TokenUsage_copilotId_Copilot_id_fk" FOREIGN KEY ("copilotId") REFERENCES "public"."Copilot"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tokenUsage_userId_idx" ON "TokenUsage" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tokenUsage_createdAt_idx" ON "TokenUsage" USING btree ("createdAt");