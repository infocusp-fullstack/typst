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

  // pdfUrl + ("#toolbar=0&navpanes=0&scrollbar=1view=FitH&print=0&download=0");
  if (pdfUrl) {
    return (
      <div className="h-full w-full overflow-hidden relative">
        {error ? (
          <div className="absolute top-3 left-3 right-3 z-10 rounded-md border border-red-300 bg-red-50/95 text-red-700 p-2 text-sm shadow-sm">
            <strong>Error:</strong> {error}
          </div>
        ) : null}
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          title="PDF Preview"
          loading="lazy"
        />
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
    <div
      className="pages-container"
      dangerouslySetInnerHTML={{ __html: content as string }}
    />
  );
});

export default PreviewPane;
