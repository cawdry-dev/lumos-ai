CREATE TABLE IF NOT EXISTS "Memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "TokenUsage" ALTER COLUMN "estimatedCostCents" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "TokenUsage" ALTER COLUMN "estimatedCostCents" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "customInstructions" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "occupation" varchar(100);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "aboutYou" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "memoryEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
