CREATE TYPE "public"."evaluator_role" AS ENUM('auto', 'peda', 'entreprise');--> statement-breakpoint
CREATE TABLE "evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alternant_profil_id" uuid NOT NULL,
	"competence_id" uuid NOT NULL,
	"evaluator" "evaluator_role" NOT NULL,
	"level" "competence_level" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_unique" UNIQUE("alternant_profil_id","competence_id","evaluator")
);
--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_alternant_profil_id_alternant_profil_id_fk" FOREIGN KEY ("alternant_profil_id") REFERENCES "public"."alternant_profil"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation" ADD CONSTRAINT "evaluation_competence_id_competence_id_fk" FOREIGN KEY ("competence_id") REFERENCES "public"."competence"("id") ON DELETE cascade ON UPDATE no action;