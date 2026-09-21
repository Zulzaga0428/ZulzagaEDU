ALTER TABLE "student_credentials" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "student_credentials" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_key" ON "users" USING btree ("phone") WHERE "users"."phone" is not null;