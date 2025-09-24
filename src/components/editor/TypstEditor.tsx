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
import dynamic from "next/dynamic";
const EditorPane = dynamic(() => import("@/components/editor/EditorPane"), {
  ssr: false,
});
const PreviewPane = dynamic(() => import("@/components/editor/PreviewPane"), {
  ssr: false,
});
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
  } = useTypstGlobal();

  const contentRef = useRef("");
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
  const didInitRef = useRef(false);
  const hasCompiledInitialRef = useRef(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  const compileTypst = useCallback(
    async (source: string) => {
      if (!source) {
        setPreview(null);
        setIsCompiling(false);
        setError(null);
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
        setIsContentLoaded(true);
      } catch {
        showToast.error("Failed to load project.");
        router.push("/dashboard");
      } finally {
      }
    };

    if (projectId !== "new") void load();
  }, [projectId, user.id, compileTypst, router]);

  const debouncedCompile = useDebounce(compileTypst, 300);

  // Trigger a single initial compile once both Typst and content are ready
  useEffect(() => {
    if (
      !hasCompiledInitialRef.current &&
      isTypstReady &&
      isContentLoaded &&
      contentRef.current
    ) {
      hasCompiledInitialRef.current = true;
      // Defer initial compile to idle time to avoid blocking LCP
      const start = () => {
        if (!contentRef.current.trim()) {
          setPreview(null);
          setIsCompiling(false);
          return;
        }

        setIsCompiling(true);
        compileAsync(contentRef.current)
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
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(start, { timeout: 1500 });
      } else {
        setTimeout(start, 0);
      }
    }
  }, [isTypstReady, isContentLoaded, compileAsync]);

  const handleChange = (newDoc: string) => {
    if (!canEdit) return; // Prevent editing if user doesn't have permission

    contentRef.current = newDoc;
    setHasChanges(true);
    debouncedCompile(newDoc);
  };

  const handleSave = useCallback(async () => {
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
  }, [typPath, canEdit, isTypstReady, compileAsync, projectId]);

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

  // Always render the layout immediately; fill in content progressively

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
        isBusy={isTypstLoading || !hasCompiledInitialRef.current || isCompiling}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r overflow-hidden h-full">
          <EditorPane
            key={
              canEdit
                ? `${projectId}-${theme}-edit`
                : `${projectId}-${theme}-${isContentLoaded ? "loaded" : "init"}`
            }
            initialContent={contentRef.current}
            theme={theme || "dark"}
            onChange={handleChange}
            onSave={handleSave}
            readOnly={!canEdit}
          />
        </div>
        <div className="w-1/2 overflow-auto preview-container h-full">
          <PreviewPane
            content={preview}
            isCompiling={isCompiling}
            error={error}
            isTypstLoading={isTypstLoading || !hasCompiledInitialRef.current}
          />
        </div>
      </div>
    </div>
  );
}
