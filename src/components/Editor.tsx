"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useTypst } from "@/hooks/useTypyst";
import {
  loadProjectFile,
  saveProjectFile,
  fetchUserProjects,
} from "@/lib/projectService";
import { EditorView, keymap, lineNumbers, ViewUpdate } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {
  history,
  historyKeymap,
  indentWithTab,
  defaultKeymap,
  undo,
  redo,
} from "@codemirror/commands";
import { typstSyntax } from "@/hooks/typystSyntax";
import { ArrowLeft, Save, Download, Moon, Sun } from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface PageAnalysis {
  pages: number;
  pageHeight: number;
  reason: string;
}

interface EditorProps {
  projectId: string;
  user: User;
  signOut: () => Promise<void>;
  initialDoc?: string;
}

export default function TypstEditor({ projectId }: EditorProps) {
  const { $typst, isReady: isTypstReady } = useTypst();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [documentContent, setDocumentContent] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [typPath, setTypPath] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [compilationError, setCompilationError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const compileTimerRef = useRef<number | undefined>(undefined);
  const autoSaveTimerRef = useRef<number | undefined>(undefined);
  const hasCompiledOnceRef = useRef(false);
  const isEditorInitializedRef = useRef(false);
  const initialContentLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(false);

  const loadProjectData = useCallback(async () => {
    if (isInitialLoadRef.current) return;
    isInitialLoadRef.current = true;

    try {
      setIsLoading(true);

      const projects = await fetchUserProjects();
      const project = projects.find((p) => p.id === projectId);

      if (!project) {
        throw new Error("Project not found");
      }

      setProjectTitle(project.title);
      setTypPath(project.typ_path);

      const content = await loadProjectFile(project.typ_path);
      setDocumentContent(content);

      // Update editor content
      if (editorViewRef.current) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: editorViewRef.current.state.doc.length,
            insert: content,
          },
        });
      }

      setLastSaved(new Date(project.updated_at));
      setHasUnsavedChanges(false);

      // Only compile if Typst is ready
      if (isTypstReady && content.trim()) {
        debouncedCompile(content);
      }
    } catch {
      alert("Failed to load project. Redirecting to dashboard.");
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, isTypstReady]);

  // Save function
  const saveDocument = useCallback(async () => {
    if (!documentContent.trim() || !typPath || isSaving) return;

    try {
      setIsSaving(true);
      await saveProjectFile(projectId, typPath, documentContent);

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch {
      alert("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [documentContent, typPath, projectId, isSaving]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (hasUnsavedChanges && !isSaving && documentContent.trim() && typPath) {
      await saveDocument();
    }
  }, [hasUnsavedChanges, isSaving, documentContent, typPath, saveDocument]);

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges) {
      const shouldSave = confirm(
        "You have unsaved changes. Do you want to save before leaving?"
      );
      if (shouldSave) {
        saveDocument().then(() => {
          router.push("/dashboard");
        });
        return;
      }
    }
    router.push("/dashboard");
  };

  // Keyboard shortcuts
  useEffect(() => {
    console.log("useEffect keydown");
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDocument();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saveDocument]);

  // Auto-save every 60 seconds
  useEffect(() => {
    console.log("useEffect auto-save");
    clearTimeout(autoSaveTimerRef.current);

    if (hasUnsavedChanges) {
      autoSaveTimerRef.current = window.setTimeout(autoSave, 60000);
    }

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [hasUnsavedChanges, autoSave]);

  // Load project data on mount
  useEffect(() => {
    console.log("useEffect project data on mount");
    if (projectId && projectId !== "new" && isTypstReady) {
      loadProjectData();
    } else if (projectId === "new") {
      setIsLoading(false);
    }
  }, [projectId, isTypstReady, loadProjectData]);

  const analyzePageRequirements = (totalHeight: number): PageAnalysis => {
    const STANDARD_PAGES = [
      { name: "Letter", height: 792 },
      { name: "A4", height: 841.89 },
      { name: "Legal", height: 1008 },
    ];

    for (const page of STANDARD_PAGES) {
      const singlePageTolerance = page.height * 0.2;
      if (totalHeight <= page.height + singlePageTolerance) {
        return {
          pages: 1,
          pageHeight: page.height,
          reason: `Content fits in single ${page.name} page`,
        };
      }
    }

    for (const page of STANDARD_PAGES) {
      const possiblePages = Math.ceil(totalHeight / page.height);
      const lastPageHeight = totalHeight - (possiblePages - 1) * page.height;
      const minLastPageHeight = page.height * 0.3;

      if (lastPageHeight >= minLastPageHeight) {
        return {
          pages: possiblePages,
          pageHeight: page.height,
          reason: `${possiblePages} ${page.name} pages`,
        };
      }
    }

    const adaptiveHeight = totalHeight / 2;
    return {
      pages: 2,
      pageHeight: adaptiveHeight,
      reason: `Adaptive sizing`,
    };
  };

  const createMultiplePages = (
    svgElement: SVGElement,
    x: number,
    y: number,
    width: number,
    totalHeight: number,
    pageHeight: number
  ): string => {
    const numPages = Math.ceil(totalHeight / pageHeight);
    let html = "";

    for (let i = 0; i < numPages; i++) {
      const startY = i * pageHeight;
      const endY = Math.min(startY + pageHeight, totalHeight);
      const currentPageHeight = endY - startY;

      html += `
        <div class="page-wrapper" data-page="${i + 1}">
          <div class="svg-page">
            <svg viewBox="${x} ${startY} ${width} ${currentPageHeight}"
                 width="100%" 
                 height="${currentPageHeight}pt"
                 xmlns="http://www.w3.org/2000/svg"
                 style="background: white; display: block;">
              ${svgElement.innerHTML}
            </svg>
          </div>
          <div class="page-info">
            Page ${i + 1} of ${numPages}
          </div>
        </div>`;
    }

    return `<div class="pages-container">${html}</div>`;
  };

  const compileAndRender = useCallback(
    async (src: string) => {
      if (!isTypstReady || !$typst || isCompiling) return;

      setIsCompiling(true);
      setCompilationError(null);
      setPreviewContent(
        '<div class="placeholder"><div>⌛ Compiling...</div></div>'
      );

      try {
        const svg = await $typst.svg({ mainContent: src });

        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const svgElement = doc.querySelector("svg");

        if (!svgElement) {
          setPreviewContent(
            '<div class="placeholder"><div>Start typing to see your document</div></div>'
          );
          return;
        }

        const viewBox = svgElement.getAttribute("viewBox");
        if (!viewBox) {
          setPreviewContent(
            `<div class="pages-container"><div class="page-wrapper"><div class="svg-page">${svg}</div></div></div>`
          );
          return;
        }

        const [x, y, svgWidth, svgHeight] = viewBox.split(" ").map(Number);
        const pageAnalysis = analyzePageRequirements(svgHeight);

        if (pageAnalysis.pages > 1) {
          const multiPageHtml = createMultiplePages(
            svgElement,
            x,
            y,
            svgWidth,
            svgHeight,
            pageAnalysis.pageHeight
          );
          setPreviewContent(multiPageHtml);
        } else {
          setPreviewContent(`
          <div class="pages-container">
            <div class="page-wrapper">
              <div class="svg-page">
                ${svg}
              </div>
            </div>
          </div>
        `);
        }
      } catch (err) {
        setPreviewContent(
          `<div class="placeholder"><div style="color: #ef4444;">❌ ${err}</div></div>`
        );
        console.error(err);
      } finally {
        setIsCompiling(false);
      }
    },
    [isTypstReady, $typst, isCompiling]
  );

  const debouncedCompile = useCallback(
    (text: string) => {
      clearTimeout(compileTimerRef.current);

      compileTimerRef.current = window.setTimeout(() => {
        const clean = text.trim();

        // If there's no content, show placeholder
        if (!clean.length) {
          setPreviewContent(
            '<div class="placeholder"><div>Start typing to see your document</div></div>'
          );
          return;
        }

        // Always compile if there's content (removed the 10-character limitation)
        hasCompiledOnceRef.current = true;
        compileAndRender(clean);
      }, 300);
    },
    [compileAndRender]
  );

  // Create theme-aware editor styling
  const createEditorTheme = useCallback(() => {
    const isDark = theme === "dark";
    return EditorView.theme({
      "&": {
        height: "100%",
        fontSize: "14px",
      },
      ".cm-scroller": {
        fontFamily: "Fira Code, Monaco, Consolas, monospace",
        padding: "1rem",
      },
      ".cm-content": {
        padding: "0",
        caretColor: isDark ? "#60a5fa" : "#3b82f6",
      },
      ".cm-focused": {
        outline: "none",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: isDark ? "#3b82f6 !important" : "#93c5fd !important",
      },
      "&.cm-focused .cm-content ::selection": {
        backgroundColor: isDark ? "#3b82f6" : "#93c5fd",
      },
      ".cm-content ::selection": {
        backgroundColor: isDark ? "#1d4ed8" : "#93c5fd",
      },
      ".cm-lineNumbers": {
        color: isDark ? "#6b7280" : "#9ca3af",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        color: isDark ? "#6b7280" : "#9ca3af",
      },
      ".cm-gutters": {
        backgroundColor: isDark ? "#1f2937" : "#f9fafb",
        borderRight: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
      },
      ".cm-activeLineGutter": {
        backgroundColor: isDark ? "#374151" : "#f3f4f6",
        color: isDark ? "#d1d5db" : "#374151",
      },
      ".cm-activeLine": {
        backgroundColor: isDark ? "#374151" : "#f3f4f6",
      },
    });
  }, [theme]);

  // Initialize editor only once
  useEffect(() => {
    console.log("useEffect init editor");
    if (!editorRef.current || isLoading || isEditorInitializedRef.current)
      return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newDoc = update.state.doc.toString();
        setDocumentContent(newDoc);
        setHasUnsavedChanges(true);
        debouncedCompile(newDoc);
      }
    });

    const state = EditorState.create({
      doc: documentContent,
      extensions: [
        lineNumbers(),
        keymap.of([
          ...historyKeymap,
          ...defaultKeymap,
          indentWithTab,
          {
            key: "Mod-z",
            run: undo,
          },
          {
            key: "Mod-Shift-z",
            run: redo,
          },
        ]),
        history(),
        typstSyntax(),
        updateListener,
        createEditorTheme(),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;
    isEditorInitializedRef.current = true;

    return () => {
      view.destroy();
      isEditorInitializedRef.current = false;
    };
  }, [isLoading, createEditorTheme]);

  // Update editor theme when theme changes
  useEffect(() => {
    console.log("useEffect update theme");
    if (editorViewRef.current && isEditorInitializedRef.current) {
      // Recreate the editor view with new theme
      const currentDoc = editorViewRef.current.state.doc.toString();
      const currentView = editorViewRef.current;

      // Destroy current view
      currentView.destroy();

      // Create new view with updated theme
      const updateListener = EditorView.updateListener.of(
        (update: ViewUpdate) => {
          if (update.docChanged) {
            const newDoc = update.state.doc.toString();
            setDocumentContent(newDoc);
            setHasUnsavedChanges(true);
            debouncedCompile(newDoc);
          }
        }
      );

      const newState = EditorState.create({
        doc: currentDoc,
        extensions: [
          lineNumbers(),
          history(),
          typstSyntax(),
          keymap.of([
            ...historyKeymap,
            ...defaultKeymap,
            indentWithTab,
            {
              key: "Mod-z",
              run: undo,
            },
            {
              key: "Mod-Shift-z",
              run: redo,
            },
          ]),
          updateListener,
          createEditorTheme(),
        ],
      });

      const newView = new EditorView({
        state: newState,
        parent: editorRef.current!,
      });

      editorViewRef.current = newView;
    }
  }, [theme, createEditorTheme, debouncedCompile]);

  // Load initial content into editor and trigger initial compilation
  useEffect(() => {
    if (
      editorViewRef.current &&
      !isLoading &&
      documentContent &&
      !initialContentLoadedRef.current
    ) {
      const currentDoc = editorViewRef.current.state.doc.toString();
      if (currentDoc !== documentContent) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: editorViewRef.current.state.doc.length,
            insert: documentContent,
          },
        });
        initialContentLoadedRef.current = true;

        // Trigger initial compilation after content is loaded
        if (isTypstReady && documentContent.trim()) {
          debouncedCompile(documentContent);
        }
      }
    }
  }, [documentContent, isLoading, isTypstReady, debouncedCompile]);

  // Cleanup timers on unmount
  useEffect(() => {
    console.log("useEffect cleanup timers");

    return () => {
      if (compileTimerRef.current) {
        clearTimeout(compileTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const exportPDF = async () => {
    if (!isTypstReady || !$typst) {
      alert("Typst is not ready yet. Please wait a moment.");
      return;
    }

    try {
      const source = editorViewRef.current?.state.doc.toString() || "";
      const data = await $typst.pdf({ mainContent: source });
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Use project title or extract name from content
      let filename = projectTitle || "typst-output";
      const match = source.match(/#let\s+name\s*=\s*"(.+?)"/);
      if (match) {
        filename = match[1].split(" ")[0];
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  if (isLoading) {
    return <Loading text="Loading your document..." fullScreen />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" onClick={handleBackToDashboard}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                T
              </span>
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
              onClick={saveDocument}
              disabled={
                isSaving || !hasUnsavedChanges || !documentContent.trim()
              }
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={exportPDF}
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

      {/* Editor and Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="w-1/2 border-r overflow-hidden">
          <div ref={editorRef} className="h-full editor-container" />
        </div>

        {/* Preview */}
        <div
          className={`w-1/2 overflow-auto bg-background ${isCompiling ? "compiling" : ""}`}
        >
          {isCompiling ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loading text="Compiling..." />
              <div className="text-xs text-muted-foreground text-center max-w-sm">
                Large documents may take a moment to compile. Please wait...
              </div>
            </div>
          ) : compilationError ? (
            <div className="error">
              <div className="error-header">Compilation Error</div>
              <div className="error-message">{compilationError}</div>
              <div className="error-hint">
                Please check your Typst syntax and try again.
              </div>
            </div>
          ) : previewContent ? (
            <div
              className="pages-container"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          ) : (
            <div className="placeholder">
              <div>Start typing to see your document</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
