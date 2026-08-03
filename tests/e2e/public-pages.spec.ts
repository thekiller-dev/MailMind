import { expect, test } from "@playwright/test";

test("la page d'accueil expose le parcours principal", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /assistant intelligent pour gmail/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /commencer/i }).first()).toBeVisible();
});

test("la page de connexion permet de changer de mode", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /votre inbox mérite mieux/i })).toBeVisible();
  await page.getByRole("button", { name: "Se connecter" }).first().click();
  await expect(page.getByRole("heading", { name: /content de vous revoir/i })).toBeVisible();
  await page.getByRole("button", { name: "Créer un compte" }).first().click();
  await expect(page.getByRole("heading", { name: /votre inbox mérite mieux/i })).toBeVisible();
  await expect(page.getByLabel("Nom complet")).toBeVisible();
});
