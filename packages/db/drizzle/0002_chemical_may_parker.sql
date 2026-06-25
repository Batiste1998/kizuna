CREATE TYPE "public"."journal_status" AS ENUM('pending', 'validated', 'changes_requested');--> statement-breakpoint
CREATE TABLE "journal_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alternant_profil_id" uuid NOT NULL,
	"author_user_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" "journal_status" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" text,
	"review_comment" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_alternant_profil_id_alternant_profil_id_fk" FOREIGN KEY ("alternant_profil_id") REFERENCES "public"."alternant_profil"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;