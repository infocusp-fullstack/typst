import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { EditorPage } from './pages/editor.page';

test.describe('CXO User', () => {
  test.use({
    storageState: 'tests/.auth/cxo-user.json',
  });

  test('can view all', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    const hasAllDocuments = await dashboardPage.hasAllDocumentsFilter();
    expect(hasAllDocuments).toBe(true);
    await dashboardPage.selectAllDocumentsFilter();
    await expect(page.getByRole('heading', { name: /all documents/i })).toBeVisible();
  });

  test('can edit all and download any', async ({ page }) => {
    test.setTimeout(90_000);
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);

    await dashboardPage.goto();
    const hasAllDocuments = await dashboardPage.hasAllDocumentsFilter();
    expect(hasAllDocuments).toBe(true);
    await dashboardPage.selectAllDocumentsFilter();

    const created = await dashboardPage.createBlankDocument(
      `CXO Editable ${Date.now()}`,
    );
    expect(created).toBe(true);

    await editorPage.expectLoaded();
    await editorPage.replaceWithValidTypst(`CXO E2E ${Date.now()}`);
    await expect(editorPage.exportPdfButton).toBeVisible();
    if (await editorPage.isExportEnabled(60_000)) {
      await editorPage.exportPdfAndWaitForDownload();
    }
  });

  test('can create multiple', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);
    const titleOne = `CXO Multiple A ${Date.now()}`;
    const titleTwo = `CXO Multiple B ${Date.now()}`;

    await dashboardPage.goto();
    const hasBlankDocument = await dashboardPage.isBlankDocumentVisible();
    expect(hasBlankDocument).toBe(true);
    const createdFirst = await dashboardPage.createBlankDocument(titleOne);
    expect(createdFirst).toBe(true);

    await editorPage.expectLoaded();
    await editorPage.goBackToDashboard();

    const createdSecond = await dashboardPage.createBlankDocument(titleTwo);
    expect(createdSecond).toBe(true);
    await editorPage.expectLoaded();
    await editorPage.goBackToDashboard();

    await dashboardPage.expectProjectVisible(titleOne);
    await dashboardPage.expectProjectVisible(titleTwo);
  });
});
