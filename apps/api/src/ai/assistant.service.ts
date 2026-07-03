import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema } from '@kizuna/db';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';
import type { AuthUser } from '../auth/auth.types';
import { AiService } from './ai.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Per-user budget: enough for real questions, a wall for runaway loops. */
const MAX_MESSAGES_PER_HOUR = 30;

const MEMBER_ROLE_LABELS: Record<string, string> = {
  owner: 'administrateur d’établissement (owner)',
  admin: 'administrateur d’établissement',
  tuteur_pedagogique: 'tuteur pédagogique (côté école)',
  tuteur_entreprise: 'tuteur d’entreprise (côté terrain)',
  alternant: 'alternant',
};

/** Minimal product context if the user manual is absent from the runtime. */
const FALLBACK_CONTEXT = `Kizuna est une plateforme de suivi d'alternance qui relie le trinôme :
alternant, tuteur pédagogique (école) et tuteur d'entreprise. Modules : compétences
(tri-évaluation sur le référentiel RNCP, niveaux NA/EC/A/M), journal d'activités
(validé par le tuteur d'entreprise), bilans tripartites (planifiés, réalisés, signés,
export PDF, lien visio), échéancier de promotion, messagerie du trinôme, documents,
tickets support. L'administrateur d'établissement gère promotions, membres,
entreprises, associations de trinômes et le référentiel de compétences.`;

/**
 * The in-app help assistant: answers usage questions from the user manual,
 * streams plain-text chunks, and hands off to the support ticket flow when a
 * question needs a human.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private manualCache: string | null = null;
  private readonly usage = new Map<string, number[]>();

  constructor(
    private readonly ai: AiService,
    private readonly database: DatabaseService,
  ) {}

  /** The user manual, read once from the repo docs (dev) or the image (prod). */
  private manual(): string {
    if (this.manualCache !== null) return this.manualCache;
    for (const candidate of [
      join(process.cwd(), '../../docs/MANUEL_UTILISATION.md'),
      join(process.cwd(), 'docs/MANUEL_UTILISATION.md'),
    ]) {
      try {
        this.manualCache = readFileSync(candidate, 'utf8');
        return this.manualCache;
      } catch {
        // try the next location
      }
    }
    this.logger.warn('MANUEL_UTILISATION.md introuvable — contexte de secours utilisé');
    this.manualCache = FALLBACK_CONTEXT;
    return this.manualCache;
  }

  private assertWithinBudget(userId: string): void {
    const now = Date.now();
    const recent = (this.usage.get(userId) ?? []).filter((t) => now - t < 3_600_000);
    if (recent.length >= MAX_MESSAGES_PER_HOUR) {
      throw new HttpException(
        'Limite de messages atteinte pour cette heure — réessayez plus tard ou créez un ticket support.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.usage.set(userId, recent);
  }

  private async roleLabel(user: AuthUser): Promise<string> {
    if (user.role === 'super_admin') return 'super administrateur de la plateforme';
    if (user.role === 'support') return 'agent support de la plateforme';
    const [membership] = await this.database.db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(eq(schema.member.userId, user.id))
      .limit(1);
    return membership ? (MEMBER_ROLE_LABELS[membership.role] ?? membership.role) : 'utilisateur';
  }

  /** Streams the assistant's reply as plain-text chunks onto the response. */
  async stream(user: AuthUser, messages: ChatMessage[], res: Response): Promise<void> {
    this.assertWithinBudget(user.id);
    const role = await this.roleLabel(user);

    const system =
      `Tu es l'assistant d'aide de Kizuna, plateforme de suivi d'alternance. ` +
      `Tu réponds en français, avec concision (quelques phrases), sans inventer de fonctionnalités. ` +
      `L'utilisateur s'appelle ${user.name} et est ${role} : adapte tes réponses à ce rôle. ` +
      `Appuie-toi sur le manuel ci-dessous. Si la question dépasse le manuel (bug, données ` +
      `manquantes, problème de compte), invite l'utilisateur à créer un ticket support via le ` +
      `bouton sous cette conversation.\n\n--- MANUEL UTILISATEUR ---\n${this.manual()}`;

    let stream: Awaited<ReturnType<AiService['chatStream']>>;
    try {
      stream = await this.ai.chatStream(system, messages);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(`Appel OpenAI impossible : ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'L’assistant est momentanément indisponible — réessayez ou créez un ticket support.',
      );
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) res.write(delta);
      }
    } catch (err) {
      this.logger.error(`Streaming assistant interrompu : ${(err as Error).message}`);
      res.write('\n\n[La réponse a été interrompue — réessayez.]');
    } finally {
      res.end();
    }
  }
}
