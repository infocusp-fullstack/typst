"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Download, Sun, Moon, Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { User } from "@supabase/supabase-js";
import { TruncateWithTooltip } from "@/components/ui/TruncateWithTooltip";
import Link from "next/link";
import Logo from "@/components/Logo";

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
  projectId,
  user,
  isOwner,
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
  projectId: string;
  user: User;
  isOwner: boolean;
}) {
  const [shareModalOpen, setShareModalOpen] = useState(false);

  return (
    <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="flex h-14 items-center px-2 sm:px-4 relative">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Back</span>
          </Button>

          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Link
              href="/"
              prefetch
              className="flex items-center gap-1 sm:gap-2 shrink-0"
            >
              <Logo size="sm" />
              <span className="font-semibold text-sm sm:text-base hidden sm:inline">
                Infocusp Resume
              </span>
              <span className="font-semibold text-sm sm:hidden">Resume</span>
            </Link>
            {projectTitle && (
              <>
                <span className="text-muted-foreground hidden sm:inline">
                  •
                </span>
                <TruncateWithTooltip<HTMLSpanElement> tooltip={projectTitle}>
                  {({ ref }) => (
                    <span
                      ref={ref}
                      className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-xs overflow-hidden whitespace-nowrap"
                    >
                      {projectTitle}
                    </span>
                  )}
                </TruncateWithTooltip>
              </>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Status indicators - hidden on very small screens */}
          <div className="hidden md:flex items-center gap-2">
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
          </div>

          {/* Action buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="shrink-0"
          >
            <Save className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            disabled={!isTypstReady || isCompiling}
            className="shrink-0"
          >
            <Download className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>

          {/* Share button - only visible to owner and on larger screens */}
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShareModalOpen(true)}
              className="hidden sm:flex shrink-0"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="shrink-0"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        projectId={projectId}
        currentUserId={user.id}
      />
    </div>
  );
});
