import { expect, test } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { EditorPage } from './pages/editor.page';

const LINK_PREFIX_TEST_CONTENT = String.raw`#import "@preview/basic-resume:0.2.8": *

#let name = "Regular User"
#let email = "regular@example.com"
#let github = "https://github.com/example-user"
#let linkedin = "linkedin.com/in/example-user"
#let personal-site = "HTTPS://example-user.dev"

#show: resume.with(
  author: name,
  email: email,
  github: github,
  linkedin: linkedin,
  personal-site: personal-site,
)

== Projects

#project(
  name: "Prefix Validation",
  url: "https://example.com/project",
)
#project(
  name: "Missing Protocol Validation",
  url: "docs.example.org/path",
)
- Ensures preview links do not include duplicate protocols.
`;

test.describe('Non-CXO User', () => {
  test.use({
    storageState: 'tests/.auth/regular-user.json',
  });

  test('can create, edit and view resume', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);
    const documentTitle = `Regular Resume ${Date.now()}`;

    await dashboardPage.goto();
    const canCreateBlank = await dashboardPage.isBlankDocumentVisible();
    const created = canCreateBlank
      ? await dashboardPage.createBlankDocument(documentTitle)
      : await dashboardPage.createFromTemplate(documentTitle);
    if (!created) {
      const openedExisting = await dashboardPage.openExistingProject();
      if (!openedExisting) {
        test.skip(
          true,
          'No blank/template creation entrypoint and no existing project available for regular-user URL edge-case check.',
        );
      }
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

  test('preview links are normalized without duplicate protocol prefixes', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);
    const documentTitle = `Regular URL Prefix ${Date.now()}`;

    await dashboardPage.goto();
    const canCreateBlank = await dashboardPage.isBlankDocumentVisible();
    const created = canCreateBlank
      ? await dashboardPage.createBlankDocument(documentTitle)
      : await dashboardPage.createFromTemplate(documentTitle);
    if (!created) {
      const openedExisting = await dashboardPage.openExistingProject();
      if (!openedExisting) {
        test.skip(
          true,
          'No blank/template creation entrypoint and no existing project available for regular-user URL edge-case check.',
        );
      }
    }

    await editorPage.expectLoaded();
    await editorPage.waitForPreviewRender();
    const beforeUpdate = await editorPage.getPreviewRenderSignature();
    await editorPage.replaceWithContent(LINK_PREFIX_TEST_CONTENT);
    await editorPage.waitForPreviewUpdate(beforeUpdate);

    const hrefs = await editorPage.getPreviewLinkHrefs();
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).not.toMatch(/^https?:\/\/https?:\/\//i);
    }

    expect(hrefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('https://github.com/example-user'),
        expect.stringContaining('https://linkedin.com/in/example-user'),
        expect.stringContaining('https://example-user.dev'),
        expect.stringContaining('https://example.com/project'),
        expect.stringContaining('https://docs.example.org/path'),
      ]),
    );

    // Additional edge-case assertions for clarity.
    expect(hrefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('linkedin.com/in/example-user'),
        expect.stringContaining('docs.example.org/path'),
      ]),
    );
  });
});
