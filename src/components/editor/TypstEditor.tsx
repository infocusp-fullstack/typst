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

interface TypstEditorProps {
  projectId: string;
  user: User;
  signOut: () => Promise<void>;
}

export default function TypstEditor({ projectId }: TypstEditorProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { $typst, isReady: isTypstReady } = useTypst();

  const contentRef = useRef("");
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<Uint8Array | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [typPath, setTypPath] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
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
    [$typst, isTypstReady],
  );

  useEffect(() => {
    if (didInitRef.current && !isTypstReady) return;
    didInitRef.current = true;

    const load = async () => {
      try {
        setIsLoading(true);

        if (isTypstReady) {
          const project = await fetchUserProjectById(projectId);
          if (!project) throw new Error("Project not found");

          const content = await loadProjectFile(project.typ_path);

          contentRef.current = content;
          setProjectTitle(project.title);
          setTypPath(project.typ_path);
          setLastSaved(new Date(project.updated_at));
          setHasChanges(false);
          compileTypst(content);
        }
      } catch {
        alert("Failed to load project.");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId !== "new") load();
  }, [projectId, isTypstReady]);

  const debouncedCompile = useDebounce(compileTypst, 1500);

  const handleChange = (newDoc: string) => {
    contentRef.current = newDoc;
    setHasChanges(true);
    debouncedCompile(newDoc);
  };

  const handleSave = async () => {
    if (!typPath || !contentRef.current) return;

    try {
      setIsSaving(true);
      await saveProjectFile(projectId, typPath, contentRef.current);
      setLastSaved(new Date());
      setHasChanges(false);
    } catch {
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!isTypstReady || !$typst) return;
    try {
      const data = await $typst.pdf({ mainContent: contentRef.current });
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle || "typst-doc"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("PDF export failed.");
    }
  };

  const handleBack = () => {
    if (hasChanges && confirm("Save before leaving?")) {
      handleSave().then(() => router.push("/dashboard"));
    } else {
      router.push("/dashboard");
    }
  };

  if (isLoading) {
    return <Loading text="Loading your document..." fullScreen />;
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
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r overflow-hidden h-full">
          <EditorPane
            key={`${projectId} - ${theme}`}
            initialContent={contentRef.current}
            theme={theme || "dark"}
            onChange={handleChange}
            onSave={handleSave}
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
