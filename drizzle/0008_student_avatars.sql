CREATE TABLE "student_avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"avatar_id" text NOT NULL,
	"selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_avatars" ADD CONSTRAINT "student_avatars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_avatars_user_avatar_key" ON "student_avatars" USING btree ("user_id","avatar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_avatars_one_selected_key" ON "student_avatars" USING btree ("user_id") WHERE "student_avatars"."selected";