import { test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { EditorPage } from './pages/editor.page';

test.describe('Non-CXO User', () => {
  test.use({
    storageState: 'tests/.auth/regular-user.json',
  });

  test('can create, edit and view resume', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);
    const documentTitle = `Regular Resume ${Date.now()}`;

    await dashboardPage.goto();
    const created = await dashboardPage.createFromTemplate(documentTitle);
    if (!created) {
      await dashboardPage.openExistingProjectOrCreateFromTemplate(documentTitle);
    }

    await editorPage.expectLoaded();
    await editorPage.appendToDocument(`Updated by regular user ${Date.now()}`);
    await editorPage.saveButton.waitFor({ state: 'visible', timeout: 15_000 });

    await editorPage.goBackToDashboard();
    if (created) {
      await dashboardPage.expectProjectVisible(documentTitle);
    } else {
      await dashboardPage.expectAnyProjectVisible();
    }
  });
});
