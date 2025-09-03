"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { useTypstGlobal } from "@/hooks/useTypstProvider";
import {
  fetchUserProjectById,
  loadProjectFile,
  saveProjectFile,
} from "@/lib/projectService";
import { useDebounce } from "@/hooks/useDebounce";
import { Toolbar } from "@/components/editor/Toolbar";
import EditorPane from "@/components/editor/EditorPane";
import PreviewPane from "@/components/editor/PreviewPane";
import { User } from "@supabase/supabase-js";

import {
  canEditProject,
  canViewProject,
  isCXOByEmail,
} from "@/lib/sharingService";
import { PDFContent } from "@/types";
import { useDialog } from "@/hooks/useDialog";
import { showToast } from "@/lib/toast";

interface TypstEditorProps {
  projectId: string;
  user: User;
  signOut: () => Promise<void>;
}

export default function TypstEditor({ projectId, user }: TypstEditorProps) {
  const { confirm } = useDialog();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const {
    $typst,
    isReady: isTypstReady,
    isLoading: isTypstLoading,
    compileAsync,
    compileSync,
  } = useTypstGlobal();

  const contentRef = useRef("");
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<PDFContent | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [typPath, setTypPath] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [totalPages, setTotalPages] = useState(0);
  const [splitPosition, setSplitPosition] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("editor-split-position");
      return saved ? parseFloat(saved) : 50;
    }
    return 50;
  });
  const [isDragging, setIsDragging] = useState(false);
  const didInitRef = useRef(false);
  const hasCompiledInitialRef = useRef(false);

  // Handle mouse events for resizing
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const container = document.querySelector(".split-container");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPosition = Math.max(20, Math.min(80, newPosition)); // Min 20%, Max 80%
      setSplitPosition(clampedPosition);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Save split position to localStorage
  useEffect(() => {
    localStorage.setItem("editor-split-position", splitPosition.toString());
  }, [splitPosition]);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const compileTypst = useCallback(
    async (source: string) => {
      if (!source) {
        setPreview(null);
        return;
      }

      setIsCompiling(true);
      setError(null);

      try {
        // Use async compilation for user edits to keep UI responsive
        const pdf = await compileAsync(source);
        setPreview(pdf);
      } catch (err) {
        console.error("Compilation failed:", err);
        setError("Compilation failed");
        setPreview(null);
      } finally {
        setIsCompiling(false);
      }
    },
    [$typst, isTypstReady]
  );

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const load = async () => {
      try {
        setIsLoading(true);

        // Fetch project meta and permissions in parallel
        const project = await fetchUserProjectById(projectId);
        if (!project) throw new Error("Project not found");

        const [editPermission, viewPermission, iscxo, content] =
          await Promise.all([
            canEditProject(projectId, user.id, project.user_id),
            canViewProject(projectId, user.id, project.user_id),
            isCXOByEmail(user.email),
            loadProjectFile(project.typ_path),
          ]);

        // Owner and permissions
        const owner = project.user_id === user.id;
        setIsOwner(owner);

        // If user is CXO, only grant elevated access for resumes
        const cxoHasAccess = iscxo && project.project_type === "resume";

        // Hard block: if not owner, not explicitly shared, and CXO lacks resume context, redirect
        if (!owner && !viewPermission && !cxoHasAccess) {
          showToast.error("You don't have access to this document.");
          router.push("/dashboard");
          return;
        }

        setCanEdit(owner || cxoHasAccess || editPermission);

        // Content and state
        contentRef.current = content;
        setProjectTitle(project.title);
        setTypPath(project.typ_path);
        setLastSaved(new Date(project.updated_at));
        setHasChanges(false);
      } catch {
        showToast.error("Failed to load project.");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId !== "new") void load();
  }, [projectId, user.id, compileTypst, router]);

  const debouncedCompile = useDebounce(compileTypst, 600);

  // Watch for Typst readiness and compile once when everything is ready
  useEffect(() => {
    if (isTypstReady && contentRef.current && !hasCompiledInitialRef.current) {
      hasCompiledInitialRef.current = true;
      setIsCompiling(true);

      // Use sync compilation for initial load since Typst should be ready
      compileSync(contentRef.current)
        .then((pdf) => {
          setPreview(pdf);
          setIsCompiling(false);
        })
        .catch((err) => {
          console.error("Initial compilation failed:", err);
          setError("Compilation failed");
          setPreview(null);
          setIsCompiling(false);
        });
    }
  }, [isTypstReady, compileSync]);

  const handleChange = (newDoc: string) => {
    if (!canEdit) return; // Prevent editing if user doesn't have permission

    contentRef.current = newDoc;
    setHasChanges(true);
    debouncedCompile(newDoc);
  };

  const handleSave = async () => {
    if (!typPath || !contentRef.current || !canEdit) return;

    try {
      setIsSaving(true);

      // Always compile fresh content for save to ensure we have the latest version
      let pdfContent: PDFContent | null = null;
      const typstInstance = $typst;
      if (!typstInstance || !isTypstReady) {
        return;
      }
      if (typstInstance) {
        try {
          pdfContent = await compileAsync(contentRef.current);
        } catch (compileError) {
          console.error("Compilation failed during save:", compileError);
          pdfContent = null;
        }
      }

      await saveProjectFile(
        projectId,
        typPath,
        contentRef.current,
        pdfContent || undefined
      );
      setLastSaved(new Date());
      setHasChanges(false);
    } catch {
      showToast.error("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    const typstInstance = $typst;
    if (!typstInstance || !isTypstReady) {
      return;
    }
    if (!typstInstance) return;

    try {
      const data = await compileAsync(contentRef.current);
      const blob = new Blob([data as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle || "typst-doc"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast.error("PDF export failed.");
    }
  };

  const handleBack = async () => {
    if (hasChanges && canEdit) {
      const confirmed = await confirm({
        title: "Save before leaving?",
        description: "Your latest edits will be saved to your document.",
        confirmText: "Save & Leave",
        cancelText: "Discard & Leave",
      });

      if (confirmed === null) {
        // Dialog was closed via cross icon, don't navigate
        return;
      }
      if (confirmed) {
        await handleSave();
      }
    }

    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <Toolbar
          key={projectId}
          projectTitle={projectTitle || "Loading..."}
          isSaving={false}
          hasUnsavedChanges={false}
          lastSaved={null}
          onSave={() => {}}
          onExport={() => {}}
          onBack={() => {}}
          theme={theme || "light"}
          toggleTheme={toggleTheme}
          isCompiling={false}
          isTypstReady={false}
          projectId={projectId}
          user={user}
          isOwner={false}
        />

        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r overflow-hidden h-full bg-muted/20">
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
            </div>
          </div>
          <div className="w-1/2 overflow-auto preview-container h-full bg-muted/10">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-b-0 border-primary" />
              <div className="text-xs text-muted-foreground">
                Preparing preview...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        key={projectId}
        projectTitle={projectTitle}
        isSaving={isSaving}
        hasUnsavedChanges={hasChanges}
        lastSaved={lastSaved}
        onSave={handleSave}
        onExport={handleExport}
        onBack={handleBack}
        theme={theme || "light"}
        toggleTheme={toggleTheme}
        isCompiling={isCompiling}
        isTypstReady={isTypstReady}
        projectId={projectId}
        user={user}
        isOwner={isOwner}
      />

      <div className="flex-1 flex overflow-hidden split-container">
        <div
          className="border-r overflow-hidden h-full"
          style={{ width: `${splitPosition}%` }}
        >
          <EditorPane
            key={`${projectId} - ${theme}`}
            initialContent={contentRef.current}
            theme={theme || "dark"}
            onChange={handleChange}
            onSave={handleSave}
            readOnly={!canEdit}
          />
        </div>

        {/* Resizable Handle */}
        <div
          className="w-2 bg-border hover:bg-accent cursor-col-resize transition-all duration-200 relative group flex items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 bg-accent-foreground/40 rounded-full" />
            <div className="w-1 h-1 bg-accent-foreground/40 rounded-full" />
            <div className="w-1 h-1 bg-accent-foreground/40 rounded-full" />
          </div>
        </div>

        <div
          className="overflow-auto preview-container h-full"
          style={{ width: `${100 - splitPosition}%` }}
        >
          <PreviewPane
            content={preview}
            isCompiling={isCompiling}
            error={error}
            scale={scale}
            totalPages={totalPages}
            onScaleChange={setScale}
            onTotalPagesChange={setTotalPages}
            isTypstLoading={isTypstLoading || !hasCompiledInitialRef.current}
          />
        </div>
      </div>
    </div>
  );
}
