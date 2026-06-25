import { relations } from 'drizzle-orm';
import { member, organization, user } from './auth';
import {
  alternantProfil,
  association,
  bilan,
  bloc,
  competence,
  document,
  echeance,
  entreprise,
  evaluation,
  journalEntry,
  message,
  promotion,
  referentiel,
  ticket,
  ticketMessage,
} from './business';

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  entreprises: many(entreprise),
  promotions: many(promotion),
  alternants: many(alternantProfil),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, { fields: [member.userId], references: [user.id] }),
}));

export const entrepriseRelations = relations(entreprise, ({ one, many }) => ({
  organization: one(organization, {
    fields: [entreprise.organizationId],
    references: [organization.id],
  }),
  associations: many(association),
}));

export const referentielRelations = relations(referentiel, ({ many }) => ({
  blocs: many(bloc),
  promotions: many(promotion),
}));

export const blocRelations = relations(bloc, ({ one, many }) => ({
  referentiel: one(referentiel, {
    fields: [bloc.referentielId],
    references: [referentiel.id],
  }),
  competences: many(competence),
}));

export const competenceRelations = relations(competence, ({ one, many }) => ({
  bloc: one(bloc, { fields: [competence.blocId], references: [bloc.id] }),
  evaluations: many(evaluation),
}));

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  alternantProfil: one(alternantProfil, {
    fields: [evaluation.alternantProfilId],
    references: [alternantProfil.id],
  }),
  competence: one(competence, {
    fields: [evaluation.competenceId],
    references: [competence.id],
  }),
}));

export const promotionRelations = relations(promotion, ({ one, many }) => ({
  organization: one(organization, {
    fields: [promotion.organizationId],
    references: [organization.id],
  }),
  referentiel: one(referentiel, {
    fields: [promotion.referentielId],
    references: [referentiel.id],
  }),
  alternants: many(alternantProfil),
  echeances: many(echeance),
}));

export const echeanceRelations = relations(echeance, ({ one }) => ({
  promotion: one(promotion, {
    fields: [echeance.promotionId],
    references: [promotion.id],
  }),
}));

export const alternantProfilRelations = relations(alternantProfil, ({ one, many }) => ({
  user: one(user, { fields: [alternantProfil.userId], references: [user.id] }),
  organization: one(organization, {
    fields: [alternantProfil.organizationId],
    references: [organization.id],
  }),
  promotion: one(promotion, {
    fields: [alternantProfil.promotionId],
    references: [promotion.id],
  }),
  association: one(association),
  evaluations: many(evaluation),
  journalEntries: many(journalEntry),
  bilans: many(bilan),
  messages: many(message),
  documents: many(document),
}));

export const documentRelations = relations(document, ({ one }) => ({
  alternantProfil: one(alternantProfil, {
    fields: [document.alternantProfilId],
    references: [alternantProfil.id],
  }),
}));

export const ticketRelations = relations(ticket, ({ one, many }) => ({
  requester: one(user, {
    fields: [ticket.requesterUserId],
    references: [user.id],
    relationName: 'ticketRequester',
  }),
  assignee: one(user, {
    fields: [ticket.assigneeUserId],
    references: [user.id],
    relationName: 'ticketAssignee',
  }),
  messages: many(ticketMessage),
}));

export const ticketMessageRelations = relations(ticketMessage, ({ one }) => ({
  ticket: one(ticket, { fields: [ticketMessage.ticketId], references: [ticket.id] }),
  author: one(user, { fields: [ticketMessage.authorUserId], references: [user.id] }),
}));

export const messageRelations = relations(message, ({ one }) => ({
  alternantProfil: one(alternantProfil, {
    fields: [message.alternantProfilId],
    references: [alternantProfil.id],
  }),
  author: one(user, { fields: [message.authorUserId], references: [user.id] }),
}));

export const bilanRelations = relations(bilan, ({ one }) => ({
  alternantProfil: one(alternantProfil, {
    fields: [bilan.alternantProfilId],
    references: [alternantProfil.id],
  }),
}));

export const journalEntryRelations = relations(journalEntry, ({ one }) => ({
  alternantProfil: one(alternantProfil, {
    fields: [journalEntry.alternantProfilId],
    references: [alternantProfil.id],
  }),
  author: one(user, { fields: [journalEntry.authorUserId], references: [user.id] }),
}));

export const associationRelations = relations(association, ({ one }) => ({
  alternantProfil: one(alternantProfil, {
    fields: [association.alternantProfilId],
    references: [alternantProfil.id],
  }),
  tuteurPeda: one(user, {
    fields: [association.tuteurPedaUserId],
    references: [user.id],
    relationName: 'tuteurPeda',
  }),
  tuteurEntreprise: one(user, {
    fields: [association.tuteurEntrepriseUserId],
    references: [user.id],
    relationName: 'tuteurEntreprise',
  }),
  entreprise: one(entreprise, {
    fields: [association.entrepriseId],
    references: [entreprise.id],
  }),
}));
