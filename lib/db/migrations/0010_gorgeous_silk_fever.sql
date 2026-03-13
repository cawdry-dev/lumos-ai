CREATE TABLE IF NOT EXISTS "EnabledModel" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"enabledAt" timestamp NOT NULL,
	"enabledBy" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'editor' NOT NULL,
	"token" varchar(64) NOT NULL,
	"invitedBy" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"acceptedAt" timestamp,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "Invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "role" varchar(20) DEFAULT 'editor' NOT NULL; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "displayName" text; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "invitedBy" uuid; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "invitedAt" timestamp; EXCEPTION WHEN duplicate_column THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EnabledModel" ADD CONSTRAINT "EnabledModel_enabledBy_User_id_fk" FOREIGN KEY ("enabledBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedBy_User_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "User" ADD CONSTRAINT "User_invitedBy_User_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
