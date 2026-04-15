import { expect, type Locator, type Page } from '@playwright/test';

export class EditorPage {
  readonly page: Page;
  readonly shareButton: Locator;
  readonly saveButton: Locator;
  readonly exportPdfButton: Locator;
  readonly backButton: Locator;
  readonly unsavedIndicator: Locator;
  readonly savedIndicator: Locator;
  readonly editorContent: Locator;
  readonly editorTextBox: Locator;
  readonly previewFrame: Locator;
  readonly overrideDialog: Locator;
  readonly overrideConfirmButton: Locator;
  readonly discardAndLeaveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shareButton = page.getByRole('button', { name: /^Share$/ });
    this.saveButton = page.getByRole('button', { name: /^Save$/ });
    this.exportPdfButton = page.getByRole('button', { name: /export pdf/i });
    this.backButton = page.getByRole('button', { name: /^Back$/ });
    this.unsavedIndicator = page.getByText('● Unsaved');
    this.savedIndicator = page.locator('span').filter({ hasText: /^Saved / });
    this.editorContent = page.locator('.cm-content').first();
    this.editorTextBox = page.getByRole('textbox').first();
    this.previewFrame = page.locator('iframe[title="PDF Preview"]');
    this.overrideDialog = page.getByRole('dialog').filter({
      hasText: /are you sure you want to override/i,
    });
    this.overrideConfirmButton = page.getByRole('button', { name: 'Override' });
    this.discardAndLeaveButton = page.getByRole('button', {
      name: 'Discard & Leave',
    });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/editor\/[0-9a-f-]+$/i, {
      timeout: 60_000,
    });
  }

  async openShareDialog() {
    await expect(this.shareButton).toBeVisible({ timeout: 30_000 });
    await this.shareButton.click();
  }

  async appendToDocument(text: string) {
    await expect(this.editorTextBox).toBeVisible({ timeout: 30_000 });
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.editorTextBox.click();
      await this.page.keyboard.press('Control+End').catch(() => undefined);
      await this.page.keyboard.insertText(`\n${text} ${attempt}`);

      const canSave = await this.saveButton.isEnabled().catch(() => false);
      if (canSave) {
        return;
      }

      await this.page.waitForTimeout(500);
    }

    throw new Error('Unable to make editor content dirty for save.');
  }

  async replaceWithValidTypst(title: string) {
    await expect(this.editorTextBox).toBeVisible({ timeout: 30_000 });
    await this.editorTextBox.click();
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.insertText(
      `= ${title}\n\nThis document was updated by Playwright E2E.\n`,
    );
  }

  async replaceWithContent(content: string) {
    await expect(this.editorTextBox).toBeVisible({ timeout: 30_000 });
    const firstNonEmptyLine =
      content
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? content.slice(0, 30);

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.editorTextBox.click();
      await this.page.keyboard.press('ControlOrMeta+A');
      await this.page.keyboard.press('Backspace');
      await this.page.keyboard.insertText(content);

      const applied = await this.editorContent
        .innerText()
        .then((text) => text.includes(firstNonEmptyLine))
        .catch(() => false);
      if (applied) {
        return;
      }

      await this.page.waitForTimeout(500);
    }

    throw new Error('Unable to replace editor content with provided Typst text.');
  }

  async saveChanges(): Promise<boolean> {
    await expect(this.saveButton).toBeEnabled({ timeout: 15_000 });
    await this.saveButton.click();

    const overrideRequested = await this.overrideDialog
      .waitFor({ state: 'visible', timeout: 2_500 })
      .then(() => true)
      .catch(() => false);
    if (overrideRequested) {
      await this.overrideConfirmButton.click();
    }

    return expect
      .poll(async () => {
        const isSaveDisabled = await this.saveButton.isDisabled();
        const unsavedVisible = await this.unsavedIndicator
          .isVisible()
          .catch(() => false);
        const savedVisible = await this.savedIndicator
          .isVisible()
          .catch(() => false);
        return isSaveDisabled || (!unsavedVisible && savedVisible);
      }, { timeout: 30_000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false);
  }

  async isExportEnabled(timeout = 20_000): Promise<boolean> {
    return this.exportPdfButton
      .waitFor({ state: 'visible', timeout })
      .then(async () => {
        await expect(this.exportPdfButton).toBeEnabled({ timeout });
        return true;
      })
      .catch(() => false);
  }

  async expectPreviewVisible() {
    await expect(this.previewFrame).toBeVisible({ timeout: 60_000 });
  }

  async waitForPreviewRender() {
    await this.expectPreviewVisible();
    await expect(this.previewFrame).toHaveAttribute('src', /blob:/, {
      timeout: 60_000,
    });
    await this.previewFrame.evaluate((frame) => {
      if (!(frame instanceof HTMLIFrameElement)) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        frame.addEventListener('load', done, { once: true });
        setTimeout(done, 5_000);
      });
    });
    await expect
      .poll(async () => (await this.previewFrame.boundingBox())?.height ?? 0, {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
  }

  async exportPdfAndWaitForDownload() {
    const downloadPromise = this.page.waitForEvent('download');
    await expect(this.exportPdfButton).toBeEnabled({ timeout: 30_000 });
    await this.exportPdfButton.click();
    await downloadPromise;
  }

  async goBackToDashboard() {
    await this.backButton.click();
    const needsDiscardConfirm = await this.discardAndLeaveButton
      .waitFor({ state: 'visible', timeout: 2_500 })
      .then(() => true)
      .catch(() => false);
    if (needsDiscardConfirm) {
      await this.discardAndLeaveButton.click();
    }
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  }
}
