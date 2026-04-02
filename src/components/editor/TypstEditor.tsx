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
import type { EditorDiagnostic } from "@/components/editor/EditorPane";
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
  triggerReload: () => void;
}

interface ParsedCompileError {
  diagnostics: EditorDiagnostic[];
  message: string;
}

function toErrorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Typst compilation error";
  }
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message || String(value);
  try {
    const direct = String(value);
    if (direct && direct !== "[object Object]") {
      return direct;
    }
  } catch {
    // no-op
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function extractMessageFromDebugString(debug: string): string | undefined {
  const patterns = [
    /message:\s*"([^"]+)"/i,
    /error:\s*"([^"]+)"/i,
    /:\s*error:\s*(.+)$/im,
  ];

  for (const pattern of patterns) {
    const match = debug.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return undefined;
}

function getLineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

function offsetToLineColumn(offset: number, lineStarts: number[]) {
  if (!Number.isFinite(offset)) {
    return { line: 1, column: 1 };
  }
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const lineIndex = Math.max(0, high);
  return {
    line: lineIndex + 1,
    column: Math.max(1, offset - lineStarts[lineIndex] + 1),
  };
}

function parseLineColumnFromText(message: string): {
  line?: number;
  column?: number;
} {
  const patterns = [
    /line\s+(\d+)(?:\s*[,:\-]\s*column\s+(\d+))?/i,
    /(?:^|[^\d])(\d+):(\d+)(?:[^\d]|$)/,
    /\((\d+)\s*,\s*(\d+)\)/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match) continue;
    const line = Number(match[1]);
    const column = match[2] ? Number(match[2]) : undefined;
    if (Number.isFinite(line) && line > 0) {
      return { line, column };
    }
  }

  return {};
}

function parseCompileError(
  error: unknown,
  source: string
): ParsedCompileError {
  const lineStarts = getLineStarts(source);
  const diagnostics: EditorDiagnostic[] = [];
  const seen = new Set<string>();
  const visited = new WeakSet<object>();
  const fallbackMessage = toErrorText(error);

  const addDiagnostic = (diagnostic: EditorDiagnostic) => {
    const normalized: EditorDiagnostic = {
      line: Math.max(1, diagnostic.line || 1),
      column: Math.max(1, diagnostic.column ?? 1),
      endLine: diagnostic.endLine ? Math.max(1, diagnostic.endLine) : undefined,
      endColumn: diagnostic.endColumn
        ? Math.max(1, diagnostic.endColumn)
        : undefined,
      message: diagnostic.message || fallbackMessage,
      severity: "error",
    };
    const key = `${normalized.line}:${normalized.column}:${normalized.endLine ?? normalized.line}:${normalized.endColumn ?? normalized.column}:${normalized.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    diagnostics.push(normalized);
  };

  const tryExtractFromRecord = (record: Record<string, unknown>) => {
    const debugString = stringifyUnknown(record);
    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.msg === "string" && record.msg) ||
      (typeof record.reason === "string" && record.reason) ||
      extractMessageFromDebugString(debugString) ||
      stringifyUnknown(record.message) ||
      stringifyUnknown(record.msg) ||
      stringifyUnknown(record.reason) ||
      "";

    const lineCandidate =
      typeof record.line === "number"
        ? record.line
        : typeof record.lineNumber === "number"
          ? record.lineNumber
          : typeof record.row === "number"
            ? record.row + 1
            : undefined;

    const columnCandidate =
      typeof record.column === "number"
        ? record.column
        : typeof record.col === "number"
          ? record.col
          : typeof record.columnNumber === "number"
            ? record.columnNumber
            : undefined;

    const endLineCandidate =
      typeof record.endLine === "number"
        ? record.endLine
        : typeof record.end_line === "number"
          ? record.end_line
          : undefined;

    const endColumnCandidate =
      typeof record.endColumn === "number"
        ? record.endColumn
        : typeof record.end_column === "number"
          ? record.end_column
          : undefined;

    let location = {
      line: lineCandidate,
      column: columnCandidate,
      endLine: endLineCandidate,
      endColumn: endColumnCandidate,
    };

    if (!location.line && typeof message === "string") {
      const parsed = parseLineColumnFromText(message);
      location = {
        ...location,
        line: parsed.line,
        column: parsed.column,
      };
    }

    const offsetFrom =
      typeof record.offset === "number"
        ? record.offset
        : typeof record.start === "number"
          ? record.start
          : typeof record.from === "number"
            ? record.from
            : undefined;

    const offsetTo =
      typeof record.end === "number"
        ? record.end
        : typeof record.to === "number"
          ? record.to
          : undefined;

    if (!location.line && Number.isFinite(offsetFrom)) {
      const start = offsetToLineColumn(offsetFrom as number, lineStarts);
      const end = Number.isFinite(offsetTo)
        ? offsetToLineColumn(offsetTo as number, lineStarts)
        : undefined;

      location = {
        line: start.line,
        column: start.column,
        endLine: end?.line,
        endColumn: end?.column,
      };
    }

    if (!location.line) {
      const parsedFromDebug = parseLineColumnFromText(debugString);
      if (parsedFromDebug.line) {
        location = {
          ...location,
          line: parsedFromDebug.line,
          column: parsedFromDebug.column,
        };
      }
    }

    if (location.line || message) {
      addDiagnostic({
        line: location.line ?? 1,
        column: location.column,
        endLine: location.endLine,
        endColumn: location.endColumn,
        message: message || fallbackMessage,
      });
    }
  };

  const visit = (value: unknown) => {
    if (!value) return;
    if (typeof value === "string") {
      const parsed = parseLineColumnFromText(value);
      if (parsed.line || value.toLowerCase().includes("error")) {
        addDiagnostic({
          line: parsed.line ?? 1,
          column: parsed.column,
          message: value,
        });
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }

    if (typeof value === "object") {
      if (visited.has(value as object)) return;
      visited.add(value as object);

      const record = value as Record<string, unknown>;
      tryExtractFromRecord(record);

      const nestedKeys = [
        "diagnostics",
        "errors",
        "causes",
        "cause",
        "inner",
        "details",
        "span",
        "trace",
      ];
      for (const key of nestedKeys) {
        if (key in record) {
          visit(record[key]);
        }
      }

      const ownKeys = Object.getOwnPropertyNames(record);
      for (const key of ownKeys) {
        if (
          key === "message" ||
          key === "stack" ||
          key === "name" ||
          nestedKeys.includes(key)
        ) {
          continue;
        }
        visit(record[key]);
      }
    }
  };

  visit(error);

  if (diagnostics.length === 0) {
    addDiagnostic({
      line: 1,
      column: 1,
      message: fallbackMessage,
    });
  }

  diagnostics.sort((a, b) =>
    a.line === b.line ? (a.column ?? 1) - (b.column ?? 1) : a.line - b.line
  );

  const firstDiagnostic = diagnostics[0];
  const errorMessage =
    diagnostics.length > 0
      ? `Compilation failed with ${diagnostics.length} error${diagnostics.length > 1 ? "s" : ""}. First error at line ${firstDiagnostic.line}, column ${firstDiagnostic.column ?? 1}: ${firstDiagnostic.message}`
      : `Compilation failed: ${fallbackMessage}`;

  return {
    diagnostics,
    message: errorMessage,
  };
}

export default function TypstEditor({
  projectId,
  user,
  triggerReload,
}: TypstEditorProps) {
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
  const [compileDiagnostics, setCompileDiagnostics] = useState<
    EditorDiagnostic[]
  >([]);
  const [lastValidatedSource, setLastValidatedSource] = useState("");
  const didInitRef = useRef(false);
  const [hasCompiledInitial, setHasCompiledInitial] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  const canSave = contentRef.current.trim() !== "";
  const hasCurrentCompileErrors =
    compileDiagnostics.length > 0 && lastValidatedSource === contentRef.current;

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
        setCompileDiagnostics([]);
        setLastValidatedSource(source);
      } catch (err) {
        const parsedError = parseCompileError(err, source);
        console.groupCollapsed(
          `[Typst] Compilation failed with ${parsedError.diagnostics.length} diagnostic(s)`
        );
        console.error("Raw compile error:", err);
        parsedError.diagnostics.forEach((diagnostic, index) => {
          console.error(
            `#${index + 1} line ${diagnostic.line}, column ${diagnostic.column ?? 1}: ${diagnostic.message}`
          );
        });
        console.groupEnd();

        setCompileDiagnostics(parsedError.diagnostics);
        setLastValidatedSource(source);
        setError(parsedError.message);
      } finally {
        setIsCompiling(false);
      }
    },
    [compileAsync]
  );

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

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

        // Hard block: if not owner, not explicitly shared, and CXO lacks resume context, redirect
        if (!owner && !viewPermission && !iscxo) {
          showToast.error("You don't have access to this document.");
          router.push("/dashboard");
          return;
        }

        setCanEdit(owner || iscxo || editPermission);

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
    if (!hasCompiledInitial && isTypstReady && isContentLoaded) {
      setHasCompiledInitial(true);

      const start = () => {
        // No content, clear preview and return
        if (!contentRef.current || !contentRef.current.trim()) {
          setPreview(null);
          setIsCompiling(false);
          setError(null);
          return;
        }

        setIsCompiling(true);
        compileAsync(contentRef.current)
          .then((pdf) => {
            setPreview(pdf);
            setCompileDiagnostics([]);
            setLastValidatedSource(contentRef.current);
          })
          .catch((err) => {
            const parsedError = parseCompileError(err, contentRef.current);
            console.groupCollapsed(
              `[Typst] Initial compilation failed with ${parsedError.diagnostics.length} diagnostic(s)`
            );
            console.error("Raw compile error:", err);
            parsedError.diagnostics.forEach((diagnostic, index) => {
              console.error(
                `#${index + 1} line ${diagnostic.line}, column ${diagnostic.column ?? 1}: ${diagnostic.message}`
              );
            });
            console.groupEnd();

            setCompileDiagnostics(parsedError.diagnostics);
            setLastValidatedSource(contentRef.current);
            setError(parsedError.message);
          })
          .finally(() => {
            setIsCompiling(false);
          });
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(start, { timeout: 1500 });
      } else {
        setTimeout(start, 0);
      }
    }
  }, [isTypstReady, isContentLoaded, compileAsync, hasCompiledInitial]);

  const handleChange = (newDoc: string) => {
    if (!canEdit) return; // Prevent editing if user doesn't have permission

    contentRef.current = newDoc;
    setHasChanges(true);
    debouncedCompile(newDoc);
  };

  // Temporary implementation. Once Supabase Realtime is integrated, this logic can be removed.
  const checkContentOverride = async () => {
    const latestProjectDetails = await fetchUserProjectById(projectId);
    if (
      JSON.stringify(new Date(latestProjectDetails?.updated_at as string)) !==
      JSON.stringify(lastSaved)
    ) {
      return true;
    }
    return false;
  };

  const handleSave = useCallback(
    async (forceSave: boolean = false) => {
      if (!typPath || !contentRef.current || !canEdit || !hasChanges) return;

      try {
        setIsSaving(true);

        if (!forceSave) {
          const areChangesConflicting = await checkContentOverride();
          if (areChangesConflicting) {
            const ok = await confirm({
              title: "Are you sure you want to override?",
              description:
                "The content has been modified by another user. Proceeding will remove their updates. Do you wish to continue?",
              confirmText: "Override",
              cancelText: "Cancel",
              customText: "Discard & Fetch Latest",
              onCustomClick: triggerReload,
            });
            if (!ok) {
              setIsSaving(false);
              return;
            }
          }
        }

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

        const updatedProjectDetails = await saveProjectFile(
          projectId,
          typPath,
          contentRef.current,
          pdfContent || undefined
        );
        setLastSaved(new Date(updatedProjectDetails?.updated_at as string));
        setHasChanges(false);
      } catch {
        showToast.error("Failed to save.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      typPath,
      canEdit,
      isTypstReady,
      compileAsync,
      projectId,
      lastSaved,
      hasChanges,
    ]
  );

  const handleExport = async () => {
    if (hasCurrentCompileErrors) {
      const first = compileDiagnostics[0];
      showToast.error(
        `Fix compile errors first (line ${first.line}, column ${first.column ?? 1}).`
      );
      return;
    }

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
        isBusy={isTypstLoading || !hasCompiledInitial || isCompiling}
        canSave={canSave}
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
            canSave={canSave}
            diagnostics={compileDiagnostics}
          />
        </div>
        <div className="w-1/2 overflow-auto preview-container h-full">
          <PreviewPane
            content={preview}
            isCompiling={isCompiling}
            error={error}
            isTypstLoading={isTypstLoading || !hasCompiledInitial}
          />
        </div>
      </div>
    </div>
  );
}
