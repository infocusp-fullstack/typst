"use client";

import { memo, useEffect, useRef, useCallback } from "react";
import { PDFContent } from "@/types";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PreviewPaneProps {
  content: PDFContent | string | null;
  isCompiling: boolean;
  error: string | null;
  scale: number;
  totalPages: number;
  onScaleChange: (scale: number) => void;
  onTotalPagesChange: (pages: number) => void;
}

export const PreviewPane = memo(function PreviewPane({
  content,
  isCompiling,
  error,
  scale,
  totalPages,
  onScaleChange,
  onTotalPagesChange,
}: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Render all pages of the PDF into <canvas>
  const renderAllPages = useCallback(async () => {
    const pdfDoc = pdfDocRef.current;
    const container = containerRef.current;
    if (!pdfDoc || !container) return;

    try {
      // Clear old pages
      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const highDpiScale = scale * 2;
          const viewport = page.getViewport({
            scale: highDpiScale,
            // Enable high-quality rendering
            dontFlip: false,
          });

          // Create container for page with relative positioning
          const pageContainer = document.createElement("div");
          pageContainer.style.position = "relative";
          if (pageNum !== pdfDoc.numPages) {
            pageContainer.style.marginBottom = "1rem";
          }
          pageContainer.style.display = "block";
          pageContainer.style.marginLeft = "auto";
          pageContainer.style.marginRight = "auto";
          pageContainer.style.width = `${viewport.width / 2}px`;
          pageContainer.style.height = `${viewport.height / 2}px`;
          pageContainer.style.transition =
            "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";
          pageContainer.style.willChange = "transform";
          pageContainer.style.backfaceVisibility = "hidden";
          pageContainer.style.perspective = "1000px";
          // Create <canvas> for the page
          const canvas = document.createElement("canvas");
          canvas.style.position = "absolute";
          canvas.style.top = "0";
          canvas.style.left = "0";
          canvas.style.imageRendering = "crisp-edges"; // Better pixel rendering

          const context = canvas.getContext("2d", {
            alpha: false,
            desynchronized: false,
            willReadFrequently: false,
          });
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = `${viewport.width / 2}px`;
          canvas.style.height = `${viewport.height / 2}px`;

          // Enable high-quality rendering on canvas
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          // Render page into canvas with high quality settings
          try {
            await page.render({
              canvasContext: context,
              viewport,
              canvas,
            }).promise;
          } catch (renderError) {
            console.warn(`Failed to render page ${pageNum}:`, renderError);
            continue;
          }

          pageContainer.appendChild(canvas);

          // Add page number overlay
          const pageNumberElement = document.createElement("div");
          pageNumberElement.textContent = `${pageNum}`;
          pageNumberElement.style.position = "absolute";
          pageNumberElement.style.bottom = "12px";
          pageNumberElement.style.right = "12px";
          pageNumberElement.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
          pageNumberElement.style.color = "white";
          pageNumberElement.style.padding = "4px 8px";
          pageNumberElement.style.borderRadius = "4px";
          pageNumberElement.style.fontSize = "10px";
          pageNumberElement.style.fontWeight = "500";
          pageNumberElement.style.zIndex = "5";
          pageNumberElement.style.border = "1px solid hsl(var(--border))";
          pageNumberElement.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.1)";
          pageContainer.appendChild(pageNumberElement);

          // Get annotations (links) for the page
          try {
            const annotations = await page.getAnnotations();

            // Create clickable overlays for links
            annotations.forEach((annotation) => {
              if (annotation.subtype === "Link" && annotation.url) {
                const linkRect = annotation.rect;
                const linkElement = document.createElement("a");

                // Convert PDF coordinates to viewport coordinates
                const x = linkRect[0] * scale;
                const y = viewport.height - linkRect[3] * scale; // Flip Y coordinate
                const width = (linkRect[2] - linkRect[0]) * scale;
                const height = (linkRect[3] - linkRect[1]) * scale;

                linkElement.href = annotation.url;
                linkElement.target = "_blank";
                linkElement.rel = "noopener noreferrer";
                linkElement.style.position = "absolute";
                linkElement.style.left = `${x}px`;
                linkElement.style.top = `${y}px`;
                linkElement.style.width = `${width}px`;
                linkElement.style.height = `${height}px`;
                linkElement.style.cursor = "pointer";
                linkElement.style.zIndex = "10";

                pageContainer.appendChild(linkElement);
              }
            });
          } catch (annotationError) {
            console.warn(
              `Failed to get annotations for page ${pageNum}:`,
              annotationError
            );
          }

          container.appendChild(pageContainer);
        } catch (pageError) {
          console.warn(`Failed to process page ${pageNum}:`, pageError);
          continue;
        }
      }
    } catch (error) {
      console.error("Error rendering PDF pages:", error);
    }
  }, [scale]);

  // Load PDF when content changes
  useEffect(() => {
    let isMounted = true;

    if (content instanceof Uint8Array) {
      (async () => {
        try {
          // Create a copy of the data to avoid ArrayBuffer detachment issues
          const dataCopy = new Uint8Array(content);
          const pdf = await pdfjsLib.getDocument({
            data: dataCopy,
            // Enable high-quality rendering
            cMapUrl: "/pdfjs/cmaps/",
            cMapPacked: true,
          }).promise;

          if (!isMounted) {
            pdf.destroy();
            return;
          }

          pdfDocRef.current = pdf;
          onTotalPagesChange(pdf.numPages);
          await renderAllPages();
        } catch (error) {
          console.error("Error loading PDF:", error);
          if (isMounted) {
            pdfDocRef.current = null;
            onTotalPagesChange(0);
            if (containerRef.current) {
              containerRef.current.innerHTML = "";
            }
          }
        }
      })();
    } else {
      pdfDocRef.current = null;
      onTotalPagesChange(0);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    }

    return () => {
      isMounted = false;
      // Cleanup PDF document when component unmounts or content changes
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch (error) {
          console.warn("Error cleaning up PDF:", error);
        }
        pdfDocRef.current = null;
      }
    };
  }, [content, renderAllPages, onTotalPagesChange]);

  // Re-render all pages when zoom changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderAllPages();
    }
  }, [scale]);

  // ---------------- UI States ----------------
  if (isCompiling) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-b-0 border-primary" />
        <div className="text-xs text-muted-foreground">
          Compiling document...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!content || (typeof content === "string" && content.trim() === "")) {
    return (
      <div className="placeholder flex items-center justify-center h-full text-muted-foreground text-sm">
        Start typing to see your document
      </div>
    );
  }

  // ---------------- PDF Viewer ----------------
  return (
    <div className="flex flex-col h-full w-full">
      {/* Minimal toolbar with zoom controls and page info */}
      <div className="flex items-center justify-center gap-1 px-1 py-1 border-b bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background h-auto">
        {/* Page info */}
        {totalPages > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 h-5 flex items-center border-border/50 bg-muted/40"
          >
            {totalPages} page{totalPages !== 1 ? "s" : ""}
          </Badge>
        )}

        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="custom"
          onClick={() => onScaleChange(Math.max(scale - 0.25, 0.25))}
          title="Zoom out"
          className="h-5 w-5 rounded-sm hover:bg-accent/50 transition-colors text-xs font-bold border border-border/30 flex items-center justify-center"
        >
          −
        </Button>

        <div className="flex items-center justify-center min-w-[32px] h-5 px-1 text-[11px] font-medium text-foreground bg-background/70 rounded border border-border/30">
          {Math.round(scale * 100)}%
        </div>

        <Button
          variant="ghost"
          size="custom"
          onClick={() => onScaleChange(scale + 0.25)}
          title="Zoom in"
          className="h-5 w-5 rounded-sm hover:bg-accent/50 transition-colors text-xs font-bold border border-border/30 flex items-center justify-center"
        >
          +
        </Button>
      </div>

      {/* Container where canvases will be appended */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-[#272822]"
      />
    </div>
  );
});
