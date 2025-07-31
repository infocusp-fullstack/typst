"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Download, Sun, Moon } from "lucide-react";

export const Toolbar = memo(function Toolbar({
  projectTitle,
  isSaving,
  hasUnsavedChanges,
  lastSaved,
  onSave,
  onExport,
  onBack,
  theme,
  toggleTheme,
  isCompiling,
  isTypstReady,
}: {
  projectTitle?: string;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  onExport: () => void;
  onBack: () => void;
  theme: string;
  toggleTheme: () => void;
  isCompiling: boolean;
  isTypstReady: boolean;
}) {
  return (
    <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-14 items-center gap-4 px-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">T</span>
          </div>
          <span className="font-semibold">Typst Editor</span>
          {projectTitle && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm">{projectTitle}</span>
            </>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {lastSaved && !hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-current" />
              Saving...
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-destructive">● Unsaved</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            disabled={!isTypstReady || isCompiling}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});
