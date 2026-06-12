import { expect, type Locator, type Page } from '@playwright/test';

export class ShareDialogPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly searchInput: Locator;
  readonly shareWithUserButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: /share document/i });
    this.searchInput = this.dialog.getByLabel('Find users by name or email');
    this.shareWithUserButton = this.dialog.getByRole('button', {
      name: /share with/i,
    });
  }

  async expectVisible() {
    await expect(this.dialog).toBeVisible();
    await expect(this.searchInput).toBeVisible();
  }

  userEntry(email: string): Locator {
    return this.dialog.locator('p', { hasText: email }).first();
  }

  async isUserAlreadyShared(email: string): Promise<boolean> {
    return (await this.userEntry(email).count()) > 0;
  }

  async shareWithUserIfNeeded(email: string, reopen: () => Promise<void>) {
    const alreadyShared = await this.isUserAlreadyShared(email);
    if (alreadyShared) {
      return;
    }

    await this.searchInput.fill(email);

    const searchResult = this.userEntry(email);
    await expect(searchResult).toBeVisible({ timeout: 15_000 });
    await searchResult.click();

    const canSubmitShare = await this.shareWithUserButton
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);

    if (!canSubmitShare) {
      return;
    }

    await this.shareWithUserButton.click();
    await expect(this.dialog).not.toBeVisible();
    await reopen();
    await this.expectVisible();
  }

  async expectUserVisible(email: string) {
    await expect(this.userEntry(email)).toBeVisible();
  }
}
