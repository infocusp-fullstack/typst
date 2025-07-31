// PreviewPane.tsx
"use client";
import { memo } from "react";

export const PreviewPane = memo(function PreviewPane({
  content,
  isCompiling,
  error,
}: {
  content: string;
  isCompiling: boolean;
  error: string | null;
}) {
  const isEmpty = !content || content.trim() === "";

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

  if (isEmpty) {
    return (
      <div className="placeholder flex items-center justify-center h-full text-muted-foreground text-sm">
        Start typing to see your document
      </div>
    );
  }

  return (
    <div
      className="pages-container"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});
