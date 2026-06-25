CREATE TYPE "public"."document_category" AS ENUM('convention', 'livret', 'compte_rendu', 'bulletin', 'autre');--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alternant_profil_id" uuid NOT NULL,
	"uploaded_by_user_id" text,
	"category" "document_category" DEFAULT 'autre' NOT NULL,
	"original_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_alternant_profil_id_alternant_profil_id_fk" FOREIGN KEY ("alternant_profil_id") REFERENCES "public"."alternant_profil"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;