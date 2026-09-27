CREATE TYPE "public"."incentive_status" AS ENUM('PENDING', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "teacher_incentives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"amount_mnt" integer NOT NULL,
	"status" "incentive_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teacher_incentives" ADD CONSTRAINT "teacher_incentives_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_incentives" ADD CONSTRAINT "teacher_incentives_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_incentives" ADD CONSTRAINT "teacher_incentives_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_incentives_teacher_period_key" ON "teacher_incentives" USING btree ("teacher_user_id","period");--> statement-breakpoint
CREATE INDEX "teacher_incentives_school_period_idx" ON "teacher_incentives" USING btree ("school_id","period");