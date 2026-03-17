-- Add personalisation columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customInstructions" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" varchar(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "occupation" varchar(100);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aboutYou" text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memoryEnabled" boolean NOT NULL DEFAULT true;

-- Create Memory table
CREATE TABLE IF NOT EXISTS "Memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "Memory_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

