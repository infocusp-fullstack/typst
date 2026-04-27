import { test as setup } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';

// ─── Auth setup tests ───
// Before running these, create the storage state files manually:
// 1. Log in via Google OAuth in the browser
// 2. Open DevTools → Application → Local Storage → localhost:3000
// 3. Copy the value of `sb-*-auth-token`
// 4. Save as tests/.auth/cxo-user.json or regular-user.json in this format:
//    {"cookies":[],"origins":[{"origin":"http://localhost:3000","localStorage":[{"name":"sb-*-auth-token","value":"<paste json>"}]}]}

// Auth state is loaded via storageState in playwright.config.ts.
// If auth is invalid/expired, the page redirects to /login — this will fail.
setup('authenticate user', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.goto();
  await dashboardPage.expectLoaded();
});
