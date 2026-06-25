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
    await expect(page).toHaveURL(/\/app$/, { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
}

test('le portail présente les rôles et le lien de connexion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kizuna' })).toBeVisible();
  await expect(page.getByText('Alternant', { exact: true })).toBeVisible();
  await expect(page.getByText('Tuteur pédagogique', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
});

test('un alternant se connecte et auto-évalue une compétence', async ({ page }) => {
  await login(page, 'alternant@kizuna.dev');
  await expect(page.getByText(/Bonjour/)).toBeVisible();

  await page.goto('/app/competences');
  // Le référentiel et ses blocs sont chargés depuis l'API (hydratation + fetch).
  await expect(page.getByText('BC01')).toBeVisible();

  // Édite le premier niveau éditable (colonne "auto") → toast de confirmation.
  await page.getByRole('button', { name: 'M', exact: true }).first().click();
  await expect(page.getByText('Évaluation enregistrée')).toBeVisible();
});

test('un administrateur voit le tableau de bord de son établissement', async ({ page }) => {
  await login(page, 'admin@kizuna.dev');

  await page.goto('/app/admin');
  await expect(page.getByRole('heading', { name: /Administration/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alternants' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Promotions' })).toBeVisible();
});
