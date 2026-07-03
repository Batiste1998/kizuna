/**
 * Les e2e ne doivent pas dépendre de la config SMTP locale du développeur :
 * un vrai SMTP_HOST dans le .env ferait passer les invitations en mode
 * « email envoyé » (et enverrait de vrais emails pendant les tests).
 * process.env prime sur le .env chargé par @nestjs/config (dotenv n'écrase
 * pas les variables déjà définies).
 */
process.env.SMTP_HOST = '';
