import { Card, CardContent } from "@/components/ui/card";
import { Template } from "@/types";
import { LayoutTemplate, Plus } from "lucide-react";
import React from "react";
import { TemplatePickerDialog } from "./TemplatePickerDialog";

interface NewDocumentCardProps {
  userId: string;
  isCreating: boolean;
  isCreatingFromTemplate?: boolean; // Add this prop
  onCreate: () => void;
  onCreateFromTemplate: (template: Template) => void;
}

export const NewDocumentCard = React.memo(function NewDocumentCard({
  isCreating,
  isCreatingFromTemplate = false, // Default to false
  onCreate,
  onCreateFromTemplate,
}: NewDocumentCardProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Start a new document</h2>

      <div className="flex gap-4 flex-wrap">
        {/* Blank document card */}
        <Card
          className={`w-72 h-24 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group ${
            isCreating || isCreatingFromTemplate
              ? "pointer-events-none opacity-50"
              : ""
          }`}
          onClick={onCreate}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              {isCreating ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Plus className="w-4 h-4 text-primary" />
              )}
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {isCreating ? "Creating..." : "Blank Document"}
            </span>
          </CardContent>
        </Card>

        {/* Template picker card */}
        <TemplatePickerDialog
          onSelect={onCreateFromTemplate}
          isCreatingFromTemplate={isCreatingFromTemplate} // Pass the prop
          trigger={
            <Card
              className={`w-72 h-24 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group ${
                isCreating || isCreatingFromTemplate
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-6">
                <div className="text-base text-black font-bold flex items-center justify-center gap-2.5 mb-3">
                  {isCreatingFromTemplate ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <LayoutTemplate />
                      <span>Start from template</span>
                    </>
                  )}
                </div>
                <span className="text-sm text-muted-foreground font-medium">
                  {isCreatingFromTemplate
                    ? "Setting up your document..."
                    : " Choose a Template"}
                </span>
              </CardContent>
            </Card>
          }
        />
      </div>
    </div>
  );
});
