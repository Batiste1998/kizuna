import { test, expect, type Page } from '@playwright/test';

const PWD = 'Password123!';

/**
 * Logs in via the form. Retries the fill+submit until the SPA navigation
 * succeeds, which also absorbs the brief SSR-hydration window (before
 * hydration a click would trigger a native submit and reload the page).
 */
async function login(page: Page, email: string) {
  await page.goto('/login');
  const emailBox = page.getByLabel('Email');
  const pwdBox = page.getByLabel('Mot de passe');
  const submit = page.getByRole('button', { name: 'Se connecter' });

  await expect(async () => {
    await emailBox.fill(email);
    await pwdBox.fill(PWD);
    await submit.click();
    // Admins are redirected from /app to /app/admin right after landing.
    await expect(page).toHaveURL(/\/app(\/|$)/, { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
}

test('le portail présente le projet et les liens de connexion / démo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kizuna' })).toBeVisible();
  await expect(page.getByText('le lien du trinôme')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Essayer la démo/ })).toBeVisible();
});

test('un alternant se connecte et auto-évalue une compétence', async ({ page }) => {
  await login(page, 'alternant@kizuna.dev');
  await expect(page.getByText(/Bonjour/)).toBeVisible();

  await page.goto('/app/competences');
  // Le référentiel et ses blocs sont chargés depuis l'API (hydratation + fetch).
  await expect(page.getByText('BC01')).toBeVisible();

  // Auto-évalue la première compétence via le fil (radiogroup de la voix "auto").
  // Deux zones différentes sont cliquées : quel que soit le niveau déjà enregistré
  // (les runs précédents laissent leur état en base), au moins un clic change la
  // valeur et déclenche le toast — le radio ne réagit pas si le niveau est identique.
  await page.getByTitle('Acquis', { exact: true }).first().click();
  await page.getByTitle('Maîtrisé', { exact: true }).first().click();
  await expect(page.getByText('Évaluation enregistrée').first()).toBeVisible();
});

test('un administrateur voit le tableau de bord de son établissement', async ({ page }) => {
  await login(page, 'admin@kizuna.dev');

  await page.goto('/app/admin');
  // Le tableau de bord d'établissement : en-tête personnalisé + KPIs propres au dashboard
  // (textes uniques, pour éviter toute collision avec les libellés de la barre latérale).
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
  await expect(page.getByText('Associations complètes')).toBeVisible();
  await expect(page.getByText('Suivi à traiter')).toBeVisible();
});
