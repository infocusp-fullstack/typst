"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTypst } from "@/hooks/useTypyst";
import {
  fetchUserProjects,
  loadProjectFile,
  saveProjectFile,
} from "@/lib/projectService";
import {
  createMultiplePages,
  analyzePageRequirements,
} from "@/lib/pageUtilities";
import { useDebounce } from "@/hooks/useDebounce";
import { Toolbar } from "./Toolbar";
import { EditorPane } from "./EditorPane";
import { PreviewPane } from "./PreviewPane";

export default function TypstEditor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { $typst, isReady: isTypstReady } = useTypst();

  const contentRef = useRef("");
  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>("");
  const [projectTitle, setProjectTitle] = useState("");
  const [typPath, setTypPath] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const projects = await fetchUserProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) throw new Error("Project not found");

        const content = await loadProjectFile(project.typ_path);
        contentRef.current = content;
        setProjectTitle(project.title);
        setTypPath(project.typ_path);
        setLastSaved(new Date(project.updated_at));
        setHasChanges(false);

        if (isTypstReady) compileTypst(content);
      } catch {
        alert("Failed to load project.");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId !== "new") load();
  }, [projectId, isTypstReady]);

  const compileTypst = useCallback(
    async (source: string) => {
      if (!$typst || !isTypstReady || !source) {
        setPreview("");
        return;
      }

      setIsCompiling(true);
      setError(null);

      try {
        const svg = await $typst.svg({ mainContent: source });

        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const svgElement = doc.querySelector("svg");

        const viewBox = svgElement?.getAttribute("viewBox");
        if (!svgElement || !svgElement.innerHTML.trim() || !viewBox) {
          setPreview("");
          return;
        }

        const [x, y, width, height] = viewBox.split(" ").map(Number);
        const pageAnalysis = analyzePageRequirements(height);

        if (pageAnalysis.pages > 1) {
          const paginated = createMultiplePages(
            svgElement,
            x,
            y,
            width,
            height,
            pageAnalysis.pageHeight
          );
          setPreview(paginated);
        } else {
          setPreview(`
            <div class="page-wrapper">
              <div class="svg-page">${svg}</div>
            </div>
        `);
        }
      } catch (err) {
        setError("Compilation failed");
        console.error(err);
        setPreview(""); // fallback on error
      } finally {
        setIsCompiling(false);
      }
    },
    [$typst, isTypstReady]
  );

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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleBack = () => {
    if (hasChanges && confirm("Save before leaving?")) {
      handleSave().then(() => router.push("/dashboard"));
    } else {
      router.push("/dashboard");
    }
  };

  return (
    !isLoading && (
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
              key={projectId}
              initialContent={contentRef.current}
              theme={theme || "light"}
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
    )
  );
}
