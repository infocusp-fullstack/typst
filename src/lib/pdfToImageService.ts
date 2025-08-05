export interface PdfToImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  density?: number;
  format?: "png" | "jpg" | "jpeg";
}

const DEFAULT_OPTIONS: PdfToImageOptions = {
  width: 210,
  height: 297,
  quality: 80,
  density: 100,
  format: "png",
};

/**
 * Convert PDF blob to canvas element using pdfjs-dist
 * This works in browser environments
 */
export async function convertPdfToCanvas(
  pdfBlob: Blob,
  options: PdfToImageOptions = {}
): Promise<HTMLCanvasElement> {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const pdfUrl = URL.createObjectURL(pdfBlob);
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Calculate viewport
    const viewport = page.getViewport({ scale: 1.0 });
    const scale = Math.min(
      mergedOptions.width! / viewport.width,
      mergedOptions.height! / viewport.height
    );
    const scaledViewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;

    // Clean up
    URL.revokeObjectURL(pdfUrl);

    return canvas;
  } catch (error) {
    console.error("PDF to canvas conversion failed:", error);
    throw error;
  }
}

/**
 * Convert PDF blob to base64 image string
 */
export async function convertPdfToBase64(
  pdfBlob: Blob,
  options: PdfToImageOptions = {}
): Promise<string> {
  try {
    const canvas = await convertPdfToCanvas(pdfBlob, options);

    // Convert canvas to base64
    const base64 = canvas.toDataURL(
      `image/${options.format || "png"}`,
      options.quality ? options.quality / 100 : 0.8
    );

    return base64;
  } catch (error) {
    console.error("PDF to base64 conversion failed:", error);
    throw error;
  }
}
