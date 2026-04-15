import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { EditorPage } from './pages/editor.page';

const RESUME_PREVIEW_CONTENT = String.raw`#import "@preview/basic-resume:0.2.8": *

#let name = "Saumya Talwani "
#let location = "San Diego, CA"
#let email = "stxu@hmc.edu"
#let github = "github.com/stuxf"
#let linkedin = "linkedin.com/in/stuxf"
#let personal-site = "stuxf.dev"

#show: resume.with(
  author: name,
  location: location,
  email: email,
  github: github,
  linkedin: linkedin,
  personal-site: personal-site,
  accent-color: "#26428b",
  font: "New Computer Modern",
  paper: "us-letter",
  author-position: left,
  personal-info-position: left,
)

== Education

#edu(
  institution: "Harvey Mudd College",
  location: "Claremont, CA",
  dates: dates-helper(start-date: "Aug 2023", end-date: "May 2027"),
  degree: "Bachelor's of Science, Computer Science and Mathematics",

  // Uncomment the line below if you want edu formatting to be consistent with everything else
  // consistent: true
)
- Cumulative GPA: 4.0\/4.0 | Dean's List, Harvey S. Mudd Merit Scholarship, National Merit Scholarship
- Relevant Coursework: Data Structures, Program Development, Microprocessors, Abstract Algebra I: Groups and Rings, Linear Algebra, Discrete Mathematics, Multivariable & Single Variable Calculus, Principles and Practice of Comp Sci
`;

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

  test('pdf preview matches existing basic resume screenshot', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const dashboardPage = new DashboardPage(page);
    const editorPage = new EditorPage(page);
    const snapshotName = 'basic-resume-from-content.png';

    await dashboardPage.goto();
    const created = await dashboardPage.createBlankDocument(
      `CXO Preview Compare ${Date.now()}`,
    );
    expect(created).toBe(true);
    
    await editorPage.expectLoaded();
    await editorPage.waitForPreviewRender();
    await editorPage.replaceWithContent(RESUME_PREVIEW_CONTENT);
    await editorPage.waitForPreviewRender();

    const previewScreenshot = await editorPage.previewFrame.screenshot({
      animations: 'disabled',
    });

    expect(previewScreenshot).toMatchSnapshot(snapshotName, {
      maxDiffPixelRatio: 0.15,
    });
  });
});
