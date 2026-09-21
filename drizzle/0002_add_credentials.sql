CREATE TABLE "credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"login_code" text,
	"pin_hash" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "credentials_login_code_unique" UNIQUE("login_code")
);
--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;