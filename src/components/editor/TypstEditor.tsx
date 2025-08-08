"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { useTypst } from "@/hooks/useTypyst";
import {
  fetchUserProjectById,
  loadProjectFile,
  saveProjectFile,
} from "@/lib/projectService";
import { useDebounce } from "@/hooks/useDebounce";
import { Toolbar } from "@/components/editor/Toolbar";
import { EditorPane } from "@/components/editor/EditorPane";
import { PreviewPane } from "@/components/editor/PreviewPane";
import { User } from "@supabase/supabase-js";
import { Loading } from "@/components/ui/loading";
import { canEditProject, isCXOByEmail } from "@/lib/sharingService";
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
  const { $typst, isReady: isTypstReady } = useTypst();

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
  const didInitRef = useRef(false);

  const compileTypst = useCallback(
    async (source: string) => {
      if (!$typst || !isTypstReady || !source) {
        setPreview(null);
        return;
      }

      setIsCompiling(true);
      setError(null);

      try {
        const pdf = await $typst.pdf({ mainContent: source });
        setPreview(pdf);
      } catch (err) {
        setError("Compilation failed");
        console.error(err);
        setPreview(null); // fallback on error
      } finally {
        setIsCompiling(false);
      }
    },
    [$typst, isTypstReady]
  );

  useEffect(() => {
    if (didInitRef.current && !isTypstReady) return;
    didInitRef.current = true;

    const load = async () => {
      try {
        setIsLoading(true);

        if (!isTypstReady) return;

        // Fetch project meta and permissions in parallel
        const project = await fetchUserProjectById(projectId);
        if (!project) throw new Error("Project not found");

        const [editPermission, iscxo, content] = await Promise.all([
          canEditProject(projectId, user.id, project.user_id),
          isCXOByEmail(user.email),
          loadProjectFile(project.typ_path),
        ]);

        // Owner and permissions
        const owner = project.user_id === user.id;
        setIsOwner(owner);
        setCanEdit(owner || iscxo || editPermission);

        // Content and state
        contentRef.current = content;
        setProjectTitle(project.title);
        setTypPath(project.typ_path);
        setLastSaved(new Date(project.updated_at));
        setHasChanges(false);

        // Compile after setting state
        compileTypst(content);
      } catch {
        showToast.error("Failed to load project.");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId !== "new") void load();
  }, [projectId, isTypstReady, user.id, compileTypst, router]);

  const debouncedCompile = useDebounce(compileTypst, 1500);

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
      if ($typst && isTypstReady) {
        try {
          pdfContent = await $typst.pdf({ mainContent: contentRef.current });
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
    if (!isTypstReady || !$typst) return;
    try {
      const data = await $typst.pdf({ mainContent: contentRef.current });
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
      const ok = await confirm({
        title: "Save before leaving?",
        description: "Your latest edits will be saved to your document.",
        confirmText: "Save & Leave",
        cancelText: "Discard Changes",
      });
      if (ok) {
        await handleSave();
      }
    }
    router.push("/dashboard");
  };

  if (isLoading) {
    return <Loading text="Preparing editor..." fullScreen />;
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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r overflow-hidden h-full">
          <EditorPane
            key={`${projectId} - ${theme}`}
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
          />
        </div>
      </div>
    </div>
  );
}
