import { expect, type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly filterTrigger: Locator;
  readonly filterButton: Locator;
  readonly allDocumentsOption: Locator;
  readonly sharedWithMeOption: Locator;
  readonly viewToggleContainer: Locator;
  readonly refreshButton: Locator;
  readonly headerTitleLink: Locator;
  readonly blankDocumentCard: Locator;
  readonly startFromTemplateCard: Locator;
  readonly startNewDocumentHeading: Locator;
  readonly existingProjectLink: Locator;
  readonly projectLinks: Locator;
  readonly templateDialog: Locator;
  readonly firstTemplateTitle: Locator;
  readonly nameDocumentHeading: Locator;
  readonly documentNameInput: Locator;
  readonly confirmDocumentNameButton: Locator;
  readonly promptInput: Locator;
  readonly allDocumentsMenuOption: Locator;

  constructor(page: Page) {
    this.page = page;
    this.filterTrigger = page.getByRole('combobox').first();
    this.filterButton = page.locator('button[role="combobox"]').first();
    this.allDocumentsOption = page.getByText('All documents');
    this.sharedWithMeOption = page.getByText(/shared with me/i);
    this.viewToggleContainer = page.locator('div:has(button svg)').first();
    this.refreshButton = page.getByRole('button', { name: /refresh/i });
    this.headerTitleLink = page.getByRole('link', {
      name: 'Infocusp Resumes Infocusp',
    });
    this.blankDocumentCard = page.getByText('Blank Document');
    this.startFromTemplateCard = page.getByText('Start from template');
    this.startNewDocumentHeading = page.getByText('Start a new document');
    this.existingProjectLink = page.locator('a[href^="/editor/"]').first();
    this.projectLinks = page.locator('a[href^="/editor/"]');
    this.templateDialog = page.getByRole('dialog', {
      name: /select a template/i,
    });
    this.firstTemplateTitle = this.templateDialog.locator('h3').first();
    this.nameDocumentHeading = page.getByRole('heading', {
      name: /name your document/i,
    });
    this.documentNameInput = page.getByLabel('Document name');
    this.confirmDocumentNameButton = page.getByRole('button', { name: 'OK' });
    this.promptInput = page.locator('#dialog-prompt-input');
    this.allDocumentsMenuOption = page.getByRole('option', {
      name: 'All documents',
    });
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async openFilter() {
    await expect(this.filterButton).toBeVisible({ timeout: 20_000 });
    await this.filterButton.click();
  }

  async openExistingProject(timeout = 10_000): Promise<boolean> {
    return this.existingProjectLink
      .waitFor({ state: 'visible', timeout })
      .then(async () => {
        await this.existingProjectLink.click();
        return true;
      })
      .catch(() => false);
  }

  async createFromTemplate(documentName: string): Promise<boolean> {
    await expect(this.startFromTemplateCard.first()).toBeVisible();
    await this.startFromTemplateCard.first().click();

    await expect(this.templateDialog).toBeVisible();
    await expect(this.firstTemplateTitle).toBeVisible();
    await this.firstTemplateTitle.click();

    const hasNamePrompt = await this.nameDocumentHeading
      .waitFor({ state: 'visible', timeout: 7_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasNamePrompt) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return false;
    }

    await this.documentNameInput.fill(documentName);
    await this.confirmDocumentNameButton.click();
    return this.page
      .waitForURL(/\/editor\/[0-9a-f-]+$/i, { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
  }

  async openExistingProjectOrCreateFromTemplate(documentName: string) {
    const openedExistingProject = await this.openExistingProject();
    if (openedExistingProject) {
      return;
    }

    const created = await this.createFromTemplate(documentName);
    if (created) {
      return;
    }

    await this.goto();
    await expect(this.existingProjectLink).toBeVisible({ timeout: 15_000 });
    await this.existingProjectLink.click();
  }

  async createBlankDocument(documentName: string) {
    await expect(this.blankDocumentCard).toBeVisible();
    await this.blankDocumentCard.click();
    const hasPrompt = await this.promptInput
      .waitFor({ state: 'visible', timeout: 7_000 })
      .then(() => true)
      .catch(() => false);
    if (!hasPrompt) {
      return false;
    }
    await this.promptInput.fill(documentName);
    await this.confirmDocumentNameButton.click();
    return this.page
      .waitForURL(/\/editor\/[0-9a-f-]+$/i, { timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
  }

  async expectProjectVisible(title: string) {
    await expect(this.page.getByText(title).first()).toBeVisible();
  }

  async selectAllDocumentsFilter() {
    await this.openFilter();
    await expect(this.allDocumentsMenuOption).toBeVisible();
    await this.allDocumentsMenuOption.click();
    await expect(this.filterButton).toContainText('All documents');
  }

  async hasAllDocumentsFilter(): Promise<boolean> {
    await this.openFilter();
    const visible = await this.allDocumentsMenuOption
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    await this.page.keyboard.press('Escape').catch(() => undefined);
    return visible;
  }

  async isBlankDocumentVisible(): Promise<boolean> {
    return this.blankDocumentCard
      .waitFor({ state: 'visible', timeout: 7_000 })
      .then(() => true)
      .catch(() => false);
  }

  async expectAnyProjectVisible() {
    await expect(this.projectLinks.first()).toBeVisible({ timeout: 20_000 });
  }
}
