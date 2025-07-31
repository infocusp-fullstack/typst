export const createMultiplePages = (
  svgElement: SVGElement,
  x: number,
  y: number,
  width: number,
  totalHeight: number,
  pageHeight: number
): string => {
  const numPages = Math.ceil(totalHeight / pageHeight);
  let html = "";

  for (let i = 0; i < numPages; i++) {
    const startY = i * pageHeight;
    const endY = Math.min(startY + pageHeight, totalHeight);
    const currentPageHeight = endY - startY;

    html += `
      <div class="page-wrapper" data-page="${i + 1}">
        <div class="svg-page">
          <svg viewBox="${x} ${startY} ${width} ${currentPageHeight}"
               width="100%" 
               height="${currentPageHeight}pt"
               xmlns="http://www.w3.org/2000/svg"
               style="background: white; display: block;">
            ${svgElement.innerHTML}
          </svg>
        </div>
        <div class="page-info">
          Page ${i + 1} of ${numPages}
        </div>
      </div>`;
  }

  return html;
};

export interface PageAnalysis {
  pages: number;
  pageHeight: number;
  reason: string;
}

export const analyzePageRequirements = (totalHeight: number): PageAnalysis => {
  const STANDARD_PAGES = [
    { name: "Letter", height: 792 },
    { name: "A4", height: 841.89 },
    { name: "Legal", height: 1008 },
  ];

  for (const page of STANDARD_PAGES) {
    const singlePageTolerance = page.height * 0.2;
    if (totalHeight <= page.height + singlePageTolerance) {
      return {
        pages: 1,
        pageHeight: page.height,
        reason: `Content fits in single ${page.name} page`,
      };
    }
  }

  for (const page of STANDARD_PAGES) {
    const possiblePages = Math.ceil(totalHeight / page.height);
    const lastPageHeight = totalHeight - (possiblePages - 1) * page.height;
    const minLastPageHeight = page.height * 0.3;

    if (lastPageHeight >= minLastPageHeight) {
      return {
        pages: possiblePages,
        pageHeight: page.height,
        reason: `${possiblePages} ${page.name} pages`,
      };
    }
  }

  const adaptiveHeight = totalHeight / 2;
  return {
    pages: 2,
    pageHeight: adaptiveHeight,
    reason: `Adaptive sizing`,
  };
};
