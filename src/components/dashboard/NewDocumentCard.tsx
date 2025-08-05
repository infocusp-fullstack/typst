// components/NewDocumentCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import React from "react";

interface NewDocumentCardProps {
  isCreating: boolean;
  onCreate: () => void;
}

export const NewDocumentCard = React.memo(function NewDocumentCard({
  isCreating,
  onCreate,
}: NewDocumentCardProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Start a new document</h2>
      <Card
        className="w-72 h-24 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
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
    </div>
  );
});
