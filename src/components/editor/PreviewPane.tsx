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
  isTypstLoading?: boolean;
}

const PreviewPane = memo(function PreviewPane({
  content,
  isCompiling,
  error,
  scale,
  totalPages,
  onScaleChange,
  onTotalPagesChange,
  isTypstLoading = false,
}: PreviewPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  const renderAllPages = useCallback(async () => {
    const pdfDoc = pdfDocRef.current;
    const container = containerRef.current;
    if (!pdfDoc || !container) return;

    try {
      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        const highDpiScale = 2;
        const viewport = page.getViewport({
          scale: highDpiScale,
          dontFlip: false,
        });

        const pageContainer = document.createElement("div");
        pageContainer.style.position = "relative";
        pageContainer.style.display = "block";
        pageContainer.style.marginLeft = "auto";
        pageContainer.style.marginRight = "auto";
        pageContainer.style.marginBottom = "1rem";
        pageContainer.style.width = `${viewport.width / 2}px`;
        pageContainer.style.height = `${viewport.height / 2}px`;
        pageContainer.style.transformOrigin = "top center";
        pageContainer.style.transform = `scale(${scale})`;
        pageContainer.style.transition =
          "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
        pageContainer.style.willChange = "transform";

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", {
          alpha: false,
          desynchronized: true,
          willReadFrequently: false,
        });
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / 2}px`;
        canvas.style.height = `${viewport.height / 2}px`;
        canvas.style.imageRendering = "crisp-edges";

        // Optimize canvas context for best quality
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.globalCompositeOperation = "source-over";

        // Clear canvas before rendering
        context.clearRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise;

        pageContainer.appendChild(canvas);

        // Page number overlay
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

        try {
          const annotations = await page.getAnnotations({ intent: "display" });

          annotations.forEach((annotation) => {
            if (annotation.subtype === "Link" && annotation.url) {
              const rect = pdfjsLib.Util.normalizeRect(annotation.rect);
              const viewportRect = viewport.convertToViewportRectangle(rect);
              const [x1, y1, x2, y2] = viewportRect;

              const linkElement = document.createElement("a");
              linkElement.href = annotation.url;
              linkElement.target = "_blank";
              linkElement.rel = "noopener noreferrer";

              // Position overlay
              linkElement.style.position = "absolute";
              linkElement.style.left = `${Math.min(x1, x2) / 2}px`;
              linkElement.style.top = `${Math.min(y1, y2) / 2}px`;
              linkElement.style.width = `${Math.abs(x2 - x1) / 2}px`;
              linkElement.style.height = `${Math.abs(y2 - y1) / 2}px`;

              linkElement.style.cursor = "pointer";
              linkElement.style.zIndex = "10";
              linkElement.style.backgroundColor = "transparent"; // invisible but clickable

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
      }
    } catch (error) {
      console.error("Error rendering PDF pages:", error);
    }
  }, []);

  // Load PDF when content changes
  useEffect(() => {
    let isMounted = true;

    if (content instanceof Uint8Array) {
      (async () => {
        try {
          const dataCopy = new Uint8Array(content);
          const pdf = await pdfjsLib.getDocument({
            data: dataCopy,
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

  // Show loading state when compiling or when Typst is loading
  if (isCompiling || isTypstLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-b-0 border-primary" />
        <div className="text-xs text-muted-foreground">
          {isTypstLoading ? "Preparing Typst..." : "Compiling document..."}
        </div>
      </div>
    );
  }

  // Only show "start typing" message if there's genuinely no content and we're not in initial load
  if (!content || (typeof content === "string" && content.trim() === "")) {
    if (!error) {
      return (
        <div className="placeholder flex items-center justify-center h-full text-muted-foreground text-sm">
          Start typing to see your document
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-1 px-1 py-1 border-b bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background h-auto">
        {totalPages > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 h-5 flex items-center border-border/50 bg-muted/40"
          >
            {totalPages} page{totalPages !== 1 ? "s" : ""}
          </Badge>
        )}

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

      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-[#272822]">
        <div
          ref={containerRef}
          className="flex flex-col items-center pb-8 pt-4"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            transition: "transform 0.25s ease-in-out",
          }}
        />
      </div>
    </div>
  );
});

export default PreviewPane;
