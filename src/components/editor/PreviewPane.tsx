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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const scaleRef = useRef(scale);
  const pixelRatioRef = useRef(1);
  const renderGenerationRef = useRef(0);
  const renderTasksRef = useRef<ReturnType<pdfjsLib.PDFPageProxy["render"]>[]>(
    [],
  );

  const cancelRenderTasks = useCallback(() => {
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch {
        // Ignore tasks that already finished or were already cancelled.
      }
    });
    renderTasksRef.current = [];
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const renderAllPages = useCallback(
    async (
      renderScale: number,
      options: {
        preserveScroll?: boolean;
      } = {},
    ) => {
      const renderGeneration = renderGenerationRef.current + 1;
      renderGenerationRef.current = renderGeneration;
      cancelRenderTasks();

      const pdfDoc = pdfDocRef.current;
      const container = containerRef.current;
      if (!pdfDoc || !container) return;
      const scrollContainer = scrollContainerRef.current;

      const shouldPreserveScroll = options.preserveScroll && scrollContainer;
      const prevMaxScrollTop = shouldPreserveScroll
        ? Math.max(
            0,
            (scrollContainer as HTMLDivElement).scrollHeight -
              (scrollContainer as HTMLDivElement).clientHeight,
          )
        : 0;
      const prevMaxScrollLeft = shouldPreserveScroll
        ? Math.max(
            0,
            (scrollContainer as HTMLDivElement).scrollWidth -
              (scrollContainer as HTMLDivElement).clientWidth,
          )
        : 0;
      const prevScrollRatioTop =
        shouldPreserveScroll && prevMaxScrollTop > 0
          ? (scrollContainer as HTMLDivElement).scrollTop / prevMaxScrollTop
          : 0;
      const prevScrollRatioLeft =
        shouldPreserveScroll && prevMaxScrollLeft > 0
          ? (scrollContainer as HTMLDivElement).scrollLeft / prevMaxScrollLeft
          : 0;
      const hadHorizontalScroll = shouldPreserveScroll && prevMaxScrollLeft > 0;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      pixelRatioRef.current = pixelRatio;

      try {
        container.replaceChildren();

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (renderGeneration !== renderGenerationRef.current) return;

          const page = await pdfDoc.getPage(pageNum);
          if (renderGeneration !== renderGenerationRef.current) return;

          const viewport = page.getViewport({
            scale: renderScale,
            dontFlip: false,
          });
          const cssWidth = viewport.width;
          const cssHeight = viewport.height;

          const pageContainer = document.createElement("div");
          pageContainer.style.position = "relative";
          pageContainer.style.display = "block";
          pageContainer.style.marginLeft = "auto";
          pageContainer.style.marginRight = "auto";
          pageContainer.style.marginBottom = "1rem";
          pageContainer.style.width = `${cssWidth}px`;
          pageContainer.style.height = `${cssHeight}px`;

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false,
          });
          if (!context) continue;

          canvas.width = Math.ceil(cssWidth * pixelRatio);
          canvas.height = Math.ceil(cssHeight * pixelRatio);
          canvas.style.width = `${cssWidth}px`;
          canvas.style.height = `${cssHeight}px`;
          canvas.style.display = "block";

          // Optimize canvas context for best quality
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.globalCompositeOperation = "source-over";

          // Clear canvas before rendering
          context.clearRect(0, 0, canvas.width, canvas.height);

          const renderTask = page.render({
            canvasContext: context,
            viewport,
            canvas,
            transform:
              pixelRatio === 1
                ? undefined
                : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });
          renderTasksRef.current.push(renderTask);

          await renderTask.promise;
          renderTasksRef.current = renderTasksRef.current.filter(
            (task) => task !== renderTask,
          );

          if (renderGeneration !== renderGenerationRef.current) return;

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
            const annotations = await page.getAnnotations({
              intent: "display",
            });

            annotations.forEach((annotation) => {
              if (annotation.subtype === "Link" && annotation.url) {
                const rect = pdfjsLib.Util.normalizeRect(annotation.rect);
                const viewportRect = viewport.convertToViewportRectangle(rect);
                const [x1, y1, x2, y2] = viewportRect;

                const linkElement = document.createElement("a");
                linkElement.href = annotation.url;
                linkElement.target = "_blank";
                linkElement.rel = "noopener noreferrer";

                linkElement.style.position = "absolute";
                linkElement.style.left = `${Math.min(x1, x2)}px`;
                linkElement.style.top = `${Math.min(y1, y2)}px`;
                linkElement.style.width = `${Math.abs(x2 - x1)}px`;
                linkElement.style.height = `${Math.abs(y2 - y1)}px`;

                linkElement.style.cursor = "pointer";
                linkElement.style.zIndex = "10";
                linkElement.style.backgroundColor = "transparent"; // invisible but clickable

                pageContainer.appendChild(linkElement);
              }
            });
          } catch (annotationError) {
            console.warn(
              `Failed to get annotations for page ${pageNum}:`,
              annotationError,
            );
          }

          if (renderGeneration !== renderGenerationRef.current) return;

          container.appendChild(pageContainer);
        }

        if (shouldPreserveScroll && scrollContainerRef.current) {
          requestAnimationFrame(() => {
            const activeScrollContainer = scrollContainerRef.current;
            if (!activeScrollContainer) return;

            const nextMaxScrollTop = Math.max(
              0,
              activeScrollContainer.scrollHeight -
                activeScrollContainer.clientHeight,
            );
            const nextMaxScrollLeft = Math.max(
              0,
              activeScrollContainer.scrollWidth - activeScrollContainer.clientWidth,
            );

            activeScrollContainer.scrollTop = prevScrollRatioTop * nextMaxScrollTop;
            activeScrollContainer.scrollLeft = hadHorizontalScroll
              ? prevScrollRatioLeft * nextMaxScrollLeft
              : nextMaxScrollLeft / 2;
          });
        }
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.name !== "RenderingCancelledException"
        ) {
          console.error("Error rendering PDF pages:", error);
        }
      }
    },
    [cancelRenderTasks],
  );

  // Load PDF when content changes
  useEffect(() => {
    let isMounted = true;
    renderGenerationRef.current += 1;
    cancelRenderTasks();

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
          await renderAllPages(scaleRef.current);
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
      renderGenerationRef.current += 1;
      cancelRenderTasks();
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch (error) {
          console.warn("Error cleaning up PDF:", error);
        }
        pdfDocRef.current = null;
      }
    };
  }, [cancelRenderTasks, content, onTotalPagesChange, renderAllPages]);

  useEffect(() => {
    if (content instanceof Uint8Array && pdfDocRef.current) {
      void renderAllPages(scale, { preserveScroll: true });
    }
  }, [content, renderAllPages, scale]);

  useEffect(() => {
    const handleResize = () => {
      const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      if (nextPixelRatio === pixelRatioRef.current) return;

      pixelRatioRef.current = nextPixelRatio;
      if (content instanceof Uint8Array && pdfDocRef.current) {
        void renderAllPages(scaleRef.current, { preserveScroll: true });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [content, renderAllPages]);

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

  if (isTypstLoading || isCompiling) {
    return <div className="h-full w-full" />;
  }

  // show "start typing" message if there's no content
  if (!content || (typeof content === "string" && content.trim() === "")) {
    if (!error) {
      return (
        <div className="placeholder flex items-center justify-center h-full text-muted-foreground text-sm">
          Start typing to see your document
        </div>
      );
    }
  }

  // Fallback for string content (if any)
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

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-[#272822]"
      >
        <div className="flex justify-center pb-8 pt-4">
          <div ref={containerRef} style={{
              transformOrigin: "top center",
              width: `${150 / scale}%`,
              transition: "transform 0.25s ease-in-out",
            }} />
        </div>
      </div>
    </div>
  );
});

export default PreviewPane;
