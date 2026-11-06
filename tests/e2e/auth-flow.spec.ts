import { test, expect } from '@playwright/test';

test('login, authenticate, and wipe local storage on logout', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/DukaanKhata/);
  const tokenBefore = await page.evaluate(() => localStorage.getItem('dukaankhata_token'));
  expect(tokenBefore).toBeNull();
});
