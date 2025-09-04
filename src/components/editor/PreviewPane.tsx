"use client";

import { memo, useEffect, useState } from "react";
import { PDFContent } from "@/types";

interface PreviewPaneProps {
  content: PDFContent | string | null;
  isCompiling: boolean;
  error: string | null;
  isTypstLoading?: boolean;
}

const PreviewPane = memo(function PreviewPane({
  content,
  isCompiling,
  error,
  isTypstLoading = false,
}: PreviewPaneProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (content instanceof Uint8Array) {
      const blob = new Blob([content as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
    }
  }, [content]);

  if (error) {
    return (
      <div className="text-red-500 p-4">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  // pdfUrl + ("#toolbar=0&navpanes=0&scrollbar=1view=FitH&print=0&download=0");
  if (pdfUrl) {
    return (
      <div className="h-full w-full overflow-hidden">
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          title="PDF Preview"
          loading="lazy"
        />
      </div>
    );
  }

  // Show loading state when Typst is loading or during compile
  if (isTypstLoading || isCompiling) {
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

  // Fallback for string content (if any)
  return (
    <div
      className="pages-container"
      dangerouslySetInnerHTML={{ __html: content as string }}
    />
  );
});

export default PreviewPane;
