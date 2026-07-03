import { describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { AiService, referentielDraftSchema } from './ai.service';

function makeService(env: Record<string, string | undefined> = {}) {
  return new AiService({
    get: vi.fn((key: string) => env[key]),
  } as unknown as ConfigService);
}

describe('AiService', () => {
  it('is not configured without an API key', () => {
    expect(makeService().isConfigured).toBe(false);
  });

  it('is configured with an API key and uses the configured model', () => {
    const service = makeService({ OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-5-nano' });
    expect(service.isConfigured).toBe(true);
    expect(service.model).toBe('gpt-5-nano');
  });

  it('defaults to gpt-5-mini when no model is configured', () => {
    expect(makeService().model).toBe('gpt-5-mini');
  });

  it('rejects extraction with a 503 when not configured', async () => {
    await expect(makeService().extractReferentiel('texte')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects completion with a 503 when not configured', async () => {
    await expect(makeService().complete('system', 'user')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

describe('referentielDraftSchema', () => {
  const validDraft = {
    code: 'RNCP39583',
    title: 'Expert en ingénierie du logiciel',
    level: 7,
    blocs: [
      {
        code: 'BC01',
        label: 'Concevoir et modéliser',
        competences: [{ code: 'C1', label: 'Analyser les besoins', description: null }],
      },
    ],
  };

  it('accepts a well-formed draft', () => {
    expect(referentielDraftSchema.safeParse(validDraft).success).toBe(true);
  });

  it('accepts null competence codes and levels', () => {
    const draft = {
      ...validDraft,
      level: null,
      blocs: [
        {
          ...validDraft.blocs[0],
          competences: [{ code: null, label: 'Analyser', description: null }],
        },
      ],
    };
    expect(referentielDraftSchema.safeParse(draft).success).toBe(true);
  });

  it('rejects a referentiel without blocs', () => {
    expect(referentielDraftSchema.safeParse({ ...validDraft, blocs: [] }).success).toBe(false);
  });

  it('rejects a bloc without compétences', () => {
    const draft = { ...validDraft, blocs: [{ ...validDraft.blocs[0], competences: [] }] };
    expect(referentielDraftSchema.safeParse(draft).success).toBe(false);
  });

  it('rejects an out-of-range level', () => {
    expect(referentielDraftSchema.safeParse({ ...validDraft, level: 12 }).success).toBe(false);
  });
});
