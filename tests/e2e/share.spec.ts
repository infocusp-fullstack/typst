import { test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { EditorPage } from './pages/editor.page';
import { ShareDialogPage } from './pages/share-dialog.page';

const DEFAULT_SHARE_TARGET_EMAIL = 'saumyatalwani@gmail.com';
const SHARE_TARGET_EMAIL =
  process.env.PW_SHARE_TARGET_EMAIL ??
  process.env.PLAYWRIGHT_SHARE_EMAIL ??
  DEFAULT_SHARE_TARGET_EMAIL;

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
