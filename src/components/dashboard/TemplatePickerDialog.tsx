import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Template } from "@/types";
import { fetchAvailableTemplates } from "@/lib/templateService";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface TemplatePickerDialogProps {
  trigger: React.ReactNode;
  onSelect: (template: Template) => void;
  isCreatingFromTemplate?: boolean;
}

export function TemplatePickerDialog({
  trigger,
  onSelect,
  isCreatingFromTemplate = false,
}: TemplatePickerDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && templates.length === 0) {
      loadTemplates();
    }
  }, [isOpen, templates.length]);

  // Close dialog when creation starts
  useEffect(() => {
    if (isCreatingFromTemplate && isOpen) {
      setIsOpen(false);
    }
  }, [isCreatingFromTemplate, isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAvailableTemplates();
      setTemplates(data as Template[]);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    onSelect(template);
  };

  const handleOpenChange = (open: boolean) => {
    if (open && isCreatingFromTemplate) return;
    setIsOpen(open);
  };

  return (
    <Dialog
      open={isOpen && !isCreatingFromTemplate}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="w-full max-w-lg sm:w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            No templates available.
          </p>
        ) : (
          <div className="pt-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="w-full cursor-pointer hover:ring-2 hover:ring-primary transition-all h-full"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{template.title}</h3>
                      {template.category && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {template.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || "No description"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
