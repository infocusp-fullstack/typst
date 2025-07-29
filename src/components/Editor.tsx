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
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
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

  const loadProjectData = useCallback(async () => {
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

      // If content is empty or very short, provide a default template
      if (!content || content.trim().length < 10) {
        const defaultContent = `#set page(width: 210mm, height: 297mm)
#set text(font: "New Computer Modern", size: 11pt)

= My Document
#lorem(100)

This is a sample Typst document. Start editing to see your changes in real-time!`;
        setDocumentContent(defaultContent);
      } else {
        setDocumentContent(content);
      }

      setLastSaved(new Date(project.updated_at));
      setHasUnsavedChanges(false);
    } catch {
      alert("Failed to load project. Redirecting to dashboard.");
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

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

  const autoSave = useCallback(async () => {
    if (hasUnsavedChanges && !isSaving && documentContent.trim() && typPath) {
      await saveDocument();
    }
  }, [hasUnsavedChanges, isSaving, documentContent, typPath, saveDocument]);

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges) {
      const shouldSave = confirm(
        "You have unsaved changes. Do you want to save before leaving?",
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDocument();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [saveDocument]);

  useEffect(() => {
    clearTimeout(autoSaveTimerRef.current);

    if (hasUnsavedChanges) {
      autoSaveTimerRef.current = window.setTimeout(autoSave, 60000);
    }

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [hasUnsavedChanges, autoSave]);

  useEffect(() => {
    if (projectId && projectId !== "new") {
      loadProjectData();
    } else {
      setIsLoading(false);
    }
  }, [projectId, loadProjectData]);

  const analyzePageRequirements = (totalHeight: number): PageAnalysis => {
    const STANDARD_PAGES = [
      { name: "Letter", height: 792 },
      { name: "A4", height: 841.89 },
      { name: "Legal", height: 1008 },
    ];

    for (const page of STANDARD_PAGES) {
      if (totalHeight <= page.height) {
        return {
          pages: 1,
          pageHeight: page.height,
          reason: `Fits on one ${page.name} page`,
        };
      }
    }

    const pages = Math.ceil(totalHeight / 841.89);
    return {
      pages,
      pageHeight: 841.89,
      reason: `Requires ${pages} A4 pages`,
    };
  };

  const createMultiplePages = (
    svgElement: SVGElement,
    x: number,
    y: number,
    width: number,
    totalHeight: number,
    pageHeight: number,
  ): string => {
    const pages = Math.ceil(totalHeight / pageHeight);
    let result = "";

    for (let i = 0; i < pages; i++) {
      const pageY = y + i * pageHeight;
      const currentHeight = Math.min(pageHeight, totalHeight - i * pageHeight);

      const pageSvg = svgElement.cloneNode(true) as SVGElement;
      pageSvg.setAttribute(
        "viewBox",
        `${x} ${pageY} ${width} ${currentHeight}`,
      );
      pageSvg.setAttribute("width", width.toString());
      pageSvg.setAttribute("height", currentHeight.toString());

      // Add page separator and styling
      if (i > 0) {
        result += '<div style="height: 20px; background: #f3f4f6; margin: 10px 0; border-radius: 4px;"></div>';
      }
      
      result += `<div style="display: flex; justify-content: center; margin-bottom: 20px;">
        ${pageSvg.outerHTML}
      </div>`;
    }

    return result;
  };

  const compileAndRender = useCallback(
    async (text: string) => {
      if (!isTypstReady || !$typst || isCompiling) return;

      try {
        setIsCompiling(true);
        setCompilationError(null);

        // Ensure text is properly formatted and clean
        const cleanText = text.trim();
        if (!cleanText) {
          setPreviewContent(
            '<div class="placeholder"><div>Start typing to see your document</div></div>',
          );
          return;
        }

        // Add basic Typst structure if not present
        let processedText = cleanText;
        if (
          !cleanText.includes("= document(") &&
          !cleanText.includes("= page(")
        ) {
          processedText = `#set page(width: 210mm, height: 297mm)
#set text(font: "New Computer Modern", size: 11pt)

${cleanText}`;
        }

        const svgData = await $typst.svg({ mainContent: processedText });

        // Check if the result is actually SVG
        if (!svgData.includes("<svg")) {
          throw new Error("Invalid SVG output from compiler");
        }

        // Parse SVG to get dimensions
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgData, "image/svg+xml");
        const svgElement = svgDoc.documentElement as unknown as SVGElement;

        if (svgElement) {
          const viewBox = svgElement.getAttribute("viewBox");
          if (viewBox) {
            const [, , width, height] = viewBox.split(" ").map(Number);
            const analysis = analyzePageRequirements(height);

            if (analysis.pages === 1) {
              setPreviewContent(svgData);
            } else {
              const multiPageSvg = createMultiplePages(
                svgElement,
                0,
                0,
                width,
                height,
                analysis.pageHeight,
              );
              setPreviewContent(multiPageSvg);
            }
          } else {
            setPreviewContent(svgData);
          }
        } else {
          setPreviewContent(svgData);
        }
      } catch (error) {
        console.error("Compilation error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Compilation failed";
        setCompilationError(errorMessage);
        setPreviewContent(
          `<div class="error">
            <div class="error-header">Compilation Error</div>
            <div class="error-message">${errorMessage}</div>
            <div class="error-hint">Please check your Typst syntax and try again.</div>
          </div>`,
        );
      } finally {
        setIsCompiling(false);
      }
    },
    [isTypstReady, $typst, isCompiling],
  );

  const debouncedCompile = useCallback(
    (text: string) => {
      clearTimeout(compileTimerRef.current);

      compileTimerRef.current = window.setTimeout(() => {
        const clean = text.trim();

        if (clean.length < 5 && !hasCompiledOnceRef.current) {
          setPreviewContent(
            '<div class="placeholder"><div>Start typing to see your document</div></div>',
          );
          return;
        }

        hasCompiledOnceRef.current = true;

        if (clean.length) {
          compileAndRender(clean);
        } else {
          setPreviewContent(
            '<div class="placeholder"><div>Start typing to see your document</div></div>',
          );
        }
      }, 300); // Reduced debounce time for better responsiveness
    },
    [compileAndRender],
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

    const createEditorState = () => EditorState.create({
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

    const state = createEditorState();

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
  }, [isLoading, debouncedCompile, createEditorTheme]);

  // Update editor theme when theme changes
  useEffect(() => {
    if (editorViewRef.current && isEditorInitializedRef.current) {
      // Recreate the editor view with new theme
      const currentDoc = editorViewRef.current.state.doc.toString();
      const currentView = editorViewRef.current;
      
      // Destroy current view
      currentView.destroy();
      
      // Create new view with updated theme
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newDoc = update.state.doc.toString();
          setDocumentContent(newDoc);
          setHasUnsavedChanges(true);
          debouncedCompile(newDoc);
        }
      });

      const newState = EditorState.create({
        doc: currentDoc,
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
      
      // Ensure proper Typst structure for PDF export
      let processedSource = source.trim();
      if (
        !processedSource.includes("= document(") &&
        !processedSource.includes("= page(")
      ) {
        processedSource = `#set page(width: 210mm, height: 297mm)
#set text(font: "New Computer Modern", size: 11pt)

${processedSource}`;
      }
      
      const data = await $typst.pdf({ mainContent: processedSource });
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

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
    } catch (error) {
      console.error("PDF export error:", error);
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
        <div className="w-1/2 overflow-auto bg-background">
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
