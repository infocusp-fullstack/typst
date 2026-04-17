import { test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { EditorPage } from './pages/editor.page';
import { ShareDialogPage } from './pages/share-dialog.page';

// Change Share Target Email here if needed. This email should exist in the auth database to pass.
const SHARE_TARGET_EMAIL = 'saumya@infocusp.com';

test.describe('Share Flow', () => {
  test.use({
    storageState: 'tests/.auth/regular-user.json',
  });

  test('can share their own resume', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);
    const shareDialogPage = new ShareDialogPage(page);

    await dashboardPage.goto();
    await dashboardPage.openExistingProjectOrCreateFromTemplate(
      `Playwright Share Test ${Date.now()}`,
    );

    await editorPage.expectLoaded();
    await editorPage.openShareDialog();

    await shareDialogPage.expectVisible();
    await shareDialogPage.shareWithUserIfNeeded(SHARE_TARGET_EMAIL!, async () => {
      await editorPage.openShareDialog();
    });
    await shareDialogPage.expectUserVisible(SHARE_TARGET_EMAIL!);
  });
});
