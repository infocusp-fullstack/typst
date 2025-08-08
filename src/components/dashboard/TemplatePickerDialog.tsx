import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Template } from "@/types";
import { fetchAvailableTemplates } from "@/lib/templateService";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getThumbnailUrl } from "@/lib/thumbnailService";
import { TemplateCard } from "./TemplateCard";

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
  const [previewUrls, setPreviewUrls] = useState<Record<string, string | null>>(
    {},
  );

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
      // Resolve preview URLs lazily after templates load
      const entries = await Promise.all(
        (data as Template[]).map(
          async (t) => [t.id, await resolvePreviewUrlForTemplate(t)] as const,
        ),
      );
      setPreviewUrls(Object.fromEntries(entries));
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

      <DialogContent className="w-full sm:w-[95vw] max-w-7xl max-h-[85vh] overflow-y-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
              {templates.map((template) => {
                const previewUrl = previewUrls[template.id] ?? null;
                return (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    previewUrl={previewUrl}
                    onImageError={() =>
                      setPreviewUrls((prev) => ({
                        ...prev,
                        [template.id]: null,
                      }))
                    }
                    onSelect={() => handleTemplateSelect(template)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function resolvePreviewUrlForTemplate(
  template: Template,
): Promise<string | null> {
  // Priority: preview_image_url as storage path
  if (template.preview_image_url) {
    return (await getThumbnailUrl(template.preview_image_url)) as string | null;
  }
  return null;
}
