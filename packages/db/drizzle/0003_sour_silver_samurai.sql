CREATE TYPE "public"."bilan_status" AS ENUM('planned', 'done', 'signed');--> statement-breakpoint
CREATE TABLE "bilan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alternant_profil_id" uuid NOT NULL,
	"label" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "bilan_status" DEFAULT 'planned' NOT NULL,
	"summary" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bilan" ADD CONSTRAINT "bilan_alternant_profil_id_alternant_profil_id_fk" FOREIGN KEY ("alternant_profil_id") REFERENCES "public"."alternant_profil"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bilan" ADD CONSTRAINT "bilan_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;