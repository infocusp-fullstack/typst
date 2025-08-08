import React from "react";
import { FileText } from "lucide-react";
import { Template } from "@/types";

interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
  previewUrl?: string | null;
  onImageError?: () => void;
}

const TemplateCard = React.memo(
  ({ template, onSelect, previewUrl, onImageError }: TemplateCardProps) => {
    const isLoadingPreview = previewUrl === undefined;

    return (
      <div
        className="group relative cursor-pointer min-w-[8.5rem] min-h-[12rem]"
        onClick={onSelect}
      >
        <div className="relative w-full aspect-[210/297] bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-3 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview of ${template.title}`}
                className="w-full h-full object-cover"
                onError={onImageError}
              />
            ) : (
              <div className="flex items-center justify-center h-2/3">
                {isLoadingPreview ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <FileText className="h-16 w-16 text-primary/30" />
                )}
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-card border-t border-border">
              <h3 className="text-sm font-medium truncate hover:text-primary transition-colors">
                {template.title}
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

TemplateCard.displayName = "TemplateCard";
export { TemplateCard };
