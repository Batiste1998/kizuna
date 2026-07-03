import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';

/** Draft referentiel extracted from pasted RNCP text, pending admin review. */
export const referentielDraftSchema = z.object({
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(300),
  level: z.number().int().min(1).max(8).nullable(),
  blocs: z
    .array(
      z.object({
        code: z.string().min(1).max(40),
        label: z.string().min(1).max(500),
        competences: z
          .array(
            z.object({
              code: z.string().max(40).nullable(),
              label: z.string().min(1).max(1000),
              description: z.string().max(4000).nullable(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type ReferentielDraft = z.infer<typeof referentielDraftSchema>;

/** Mirror of the zod schema for OpenAI structured outputs (strict mode). */
const REFERENTIEL_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'title', 'level', 'blocs'],
  properties: {
    code: { type: 'string', description: 'Code du titre, ex. « RNCP39583 »' },
    title: { type: 'string', description: 'Intitulé officiel du titre professionnel' },
    level: { type: ['integer', 'null'], description: 'Niveau européen (5, 6, 7, 8) ou null' },
    blocs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'label', 'competences'],
        properties: {
          code: { type: 'string', description: 'Code du bloc, ex. « BC01 » (sinon RNCP39583BC01 → BC01)' },
          label: { type: 'string' },
          competences: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['code', 'label', 'description'],
              properties: {
                code: { type: ['string', 'null'], description: 'Code de la compétence, ex. « C1 », ou null' },
                label: { type: 'string', description: 'Intitulé court de la compétence' },
                description: { type: ['string', 'null'], description: 'Critères / modalités d’évaluation, ou null' },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Thin OpenAI gateway: one client, model configured via OPENAI_MODEL
 * (gpt-5-mini by default — extraction and drafting stay under a cent per call).
 * Every feature behind it degrades gracefully when no API key is configured.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = config.get<string>('OPENAI_MODEL') ?? 'gpt-5-mini';
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  private requireClient(): OpenAI {
    if (!this.client)
      throw new ServiceUnavailableException(
        'Fonctions IA non configurées (OPENAI_API_KEY absente).',
      );
    return this.client;
  }

  /** GPT-5 family accepts reasoning_effort; other models would reject it. */
  private reasoningParams(): { reasoning_effort?: 'low' } {
    return /^(gpt-5|o\d)/.test(this.model) ? { reasoning_effort: 'low' } : {};
  }

  /** Structured extraction of an RNCP referentiel from pasted text. */
  async extractReferentiel(text: string): Promise<ReferentielDraft> {
    const client = this.requireClient();
    const completion = await client.chat.completions.create({
      model: this.model,
      ...this.reasoningParams(),
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'referentiel_rncp', strict: true, schema: REFERENTIEL_JSON_SCHEMA },
      },
      messages: [
        {
          role: 'system',
          content:
            'Tu extrais la structure d’un référentiel de compétences RNCP français à partir ' +
            'd’un texte brut (souvent copié depuis France Compétences ou un PDF). ' +
            'Restitue fidèlement les blocs de compétences (codes BC01, BC02…) et leurs ' +
            'compétences, sans inventer ni résumer les intitulés. Si le texte contient des ' +
            'artefacts de copie (numéros de page, en-têtes répétés), ignore-les.',
        },
        { role: 'user', content: text },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      this.logger.error('Extraction référentiel : réponse OpenAI vide');
      throw new ServiceUnavailableException('L’analyse IA n’a pas produit de résultat.');
    }
    const parsed = referentielDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      this.logger.error(`Extraction référentiel : sortie invalide — ${parsed.error.message}`);
      throw new ServiceUnavailableException('L’analyse IA a produit une structure invalide.');
    }
    return parsed.data;
  }

  /** Streaming chat completion (help assistant). */
  async chatStream(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) {
    const client = this.requireClient();
    return client.chat.completions.create({
      model: this.model,
      ...this.reasoningParams(),
      stream: true,
      messages: [{ role: 'system' as const, content: system }, ...messages],
    });
  }

  /** One-shot completion for drafting features (bilan summaries…). */
  async complete(system: string, user: string): Promise<string> {
    const client = this.requireClient();
    const completion = await client.chat.completions.create({
      model: this.model,
      ...this.reasoningParams(),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? '';
  }
}
