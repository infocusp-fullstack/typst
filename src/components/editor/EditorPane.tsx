"use client";

import { EditorView } from "@codemirror/view";
import { useEffect, useRef, useCallback } from "react";
import { ReviewComment } from "@/types";

export interface EditorDiagnostic {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity?: "error" | "warning";
}

export default function EditorPane({
  initialContent,
  theme,
  onChange,
  onSave,
  readOnly = false,
  canSave = true,
  diagnostics = [],
  comments = [],
  onCommentClick,
  onSelectionChange,
}: {
  initialContent: string;
  theme: string;
  onChange: (doc: string) => void;
  onSave: () => void;
  readOnly?: boolean;
  canSave?: boolean;
  diagnostics?: EditorDiagnostic[];
  comments?: ReviewComment[];
  onCommentClick?: (comment: ReviewComment) => void;
  onSelectionChange?: (range: { from: number; to: number } | null) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const didInitRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const diagnosticsRef = useRef(diagnostics);
  const commentsRef = useRef(comments);
  const onCommentClickRef = useRef(onCommentClick);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const commentsDispatchRef = useRef<
    null | ((nextComments: ReviewComment[]) => void)
  >(null);
  const diagnosticsDispatchRef = useRef<
    null | ((nextDiagnostics: EditorDiagnostic[]) => void)
  >(null);
  const selectionRangeRef = useRef<{ from: number; to: number }>({ from: 0, to: 0 });

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    diagnosticsRef.current = diagnostics;
  }, [diagnostics]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    onCommentClickRef.current = onCommentClick;
  }, [onCommentClick]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const createEditorTheme = useCallback(() => {
    const isDark = theme === "dark";

    return EditorView.theme(
      {
        "&": {
          height: "100%",
          fontSize: "14px",
          backgroundColor: isDark ? "#272822" : "#ffffff",
          color: isDark ? "#f8f8f2" : "#111827",
        },
        ".cm-scroller": {
          fontFamily: "Fira Code, Monaco, Consolas, monospace",
          padding: "1rem",
        },
        ".cm-content": {
          padding: "0",
          caretColor: isDark ? "#f8f8f0" : "#3b82f6",
        },
        ".cm-line": {
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        },
        ".cm-focused": {
          outline: "none",
        },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
          backgroundColor: isDark ? "#49483E !important" : "#D6D6D6 !important",
        },
        ".cm-lineNumbers": {
          color: isDark ? "#75715e" : "#9ca3af",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          color: isDark ? "#75715e" : "#9ca3af",
        },
        ".cm-gutters": {
          backgroundColor: isDark ? "#272822" : "#f9fafb",
          borderRight: isDark ? "1px solid #3E3D32" : "1px solid #e5e7eb",
        },
        ".cm-activeLine": {
          backgroundColor: isDark ? "#3E3D32" : "#f3f4f6",
        },
        ".cm-activeLineGutter": {
          backgroundColor: isDark ? "#3E3D32" : "#f3f4f6",
        },
        ".cm-strong": {
          fontWeight: "bold",
          color: isDark ? "#f92672" : "#d81159",
        },
        ".cm-em": {
          fontStyle: "italic",
          color: isDark ? "#fd971f" : "#c2410c",
        },
        ".cm-heading": {
          fontWeight: "bold",
          color: isDark ? "#a6e22e" : "#15803d",
        },
        ".cm-keyword": {
          color: isDark ? "#66d9ef" : "#2563eb",
        },
        ".cm-string": {
          color: isDark ? "#e6db74" : "#b45309",
        },
        ".cm-comment": {
          color: isDark ? "#75715e" : "#6b7280",
          fontStyle: "italic",
        },
        ".cm-variableName": {
          color: isDark ? "#f8f8f2" : "#111827",
        },
        ".cm-typst-error-squiggle": {
          textDecorationLine: "underline",
          textDecorationStyle: "wavy",
          textDecorationThickness: "1.5px",
          textDecorationColor: isDark ? "#ff6b6b" : "#dc2626",
          textUnderlineOffset: "2px",
          backgroundColor: isDark
            ? "rgba(255, 107, 107, 0.12)"
            : "rgba(220, 38, 38, 0.08)",
        },
        ".cm-typst-error-line": {
          backgroundColor: isDark
            ? "rgba(255, 107, 107, 0.10)"
            : "rgba(220, 38, 38, 0.08)",
        },
        ".cm-comment-highlight": {
          backgroundColor: isDark
            ? "rgba(255, 215, 0, 0.15)"
            : "rgba(255, 215, 0, 0.3)",
          borderRadius: "2px",
          cursor: "pointer",
        },
        ".cm-comment-marker": {
          display: "inline-flex",
          alignItems: "center",
          marginLeft: "4px",
          padding: "0 4px",
          borderRadius: "4px",
          fontSize: "11px",
          fontFamily: "inherit",
          backgroundColor: isDark
            ? "rgba(255, 215, 0, 0.3)"
            : "rgba(255, 215, 0, 0.5)",
          color: isDark ? "#1a1a1a" : "#333",
          cursor: "pointer",
          verticalAlign: "middle",
        },
        ".cm-comment-popover": {
          position: "absolute",
          zIndex: 100,
          backgroundColor: isDark ? "#2d2d2d" : "#fff",
          border: `1px solid ${isDark ? "#444" : "#e5e7eb"}`,
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: "12px",
          minWidth: "200px",
          maxWidth: "300px",
        },
        ".cm-comment-highlight:hover": {
          backgroundColor: isDark
            ? "rgba(255, 215, 0, 0.25)"
            : "rgba(255, 215, 0, 0.5)",
        },
      },
      { dark: isDark }
    );
  }, [theme]);

  useEffect(() => {
    if (!editorRef.current || didInitRef.current) return;

    Promise.all([
      import("@codemirror/view"),
      import("@codemirror/state"),
      import("@codemirror/commands"),
      import("@/hooks/typystSyntax"),
    ])
      .then(([viewPkg, statePkg, commandsPkg, typstPkg]) => {
        const { EditorView, keymap, lineNumbers, Decoration } = viewPkg;
        const { EditorState, StateField, StateEffect, RangeSetBuilder } =
          statePkg;
        const {
          history,
          historyKeymap,
          indentWithTab,
          defaultKeymap,
          undo,
          redo,
        } = commandsPkg;
        const { typstSyntax } = typstPkg;

        const updateListener = EditorView.updateListener.of((update) => {
          if (update.docChanged && !readOnly) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet) {
            const range = update.state.selection.main;
            selectionRangeRef.current = { from: range.from, to: range.to };
            onSelectionChangeRef.current?.(
              range.from !== range.to ? { from: range.from, to: range.to } : null
            );
          }
        });

        const saveKeymap = {
          key: "Mod-s",
          run: () => {
            if (!readOnly && canSave) {
              onSaveRef.current();
            }
            return true;
          },
        };

        const readOnlyKeymap = readOnly
          ? []
          : [
            ...historyKeymap,
            ...defaultKeymap,
            indentWithTab,
            { key: "Mod-z", run: undo },
            { key: "Mod-Shift-z", run: redo },
          ];

        const setDiagnosticsEffect = StateEffect.define<EditorDiagnostic[]>();
        const setCommentsEffect = StateEffect.define<ReviewComment[]>();
        const clearPopoverEffect = StateEffect.define<void>();
        const popoverField = StateField.define({
          create: () => Decoration.none,
          update: (deco, tr) => {
            for (const effect of tr.effects) {
              if (effect.is(clearPopoverEffect)) {
                return Decoration.none;
              }
            }
            if (deco.map) {
              return deco.map(tr.changes);
            }
            return deco;
          },
          provide: (f) => EditorView.decorations.from(f),
        });
        const buildDiagnosticDecorations = (
          state: typeof EditorState.prototype,
          nextDiagnostics: EditorDiagnostic[]
        ) => {
          const getWordRangeOnLine = (
            lineText: string,
            startColumn: number
          ): { startOffset: number; endOffset: number } => {
            if (!lineText.length) {
              return { startOffset: 0, endOffset: 0 };
            }

            const safeStart = Math.min(Math.max(startColumn, 0), lineText.length - 1);
            const isWordChar = (char: string) => /[A-Za-z0-9_-]/.test(char);

            if (!isWordChar(lineText[safeStart])) {
              return { startOffset: safeStart, endOffset: safeStart + 1 };
            }

            let startOffset = safeStart;
            while (startOffset > 0 && isWordChar(lineText[startOffset - 1])) {
              startOffset -= 1;
            }

            let endOffset = safeStart + 1;
            while (endOffset < lineText.length && isWordChar(lineText[endOffset])) {
              endOffset += 1;
            }

            return { startOffset, endOffset };
          };

          const builder = new RangeSetBuilder<typeof Decoration.prototype>();

          for (const diagnostic of nextDiagnostics) {
            const clampedLine = Math.min(
              Math.max(1, diagnostic.line || 1),
              state.doc.lines
            );
            const lineInfo = state.doc.line(clampedLine);
            const startColumn = Math.max((diagnostic.column ?? 1) - 1, 0);
            const start = Math.min(lineInfo.from + startColumn, lineInfo.to);

            const clampedEndLine = Math.min(
              Math.max(1, diagnostic.endLine ?? clampedLine),
              state.doc.lines
            );
            const endLineInfo = state.doc.line(clampedEndLine);
            let endColumn = Math.max(
              (diagnostic.endColumn ??
                (clampedEndLine === clampedLine ? diagnostic.column ?? 1 : 1)) -
                1,
              0
            );

            if (!diagnostic.endColumn && clampedEndLine === clampedLine) {
              const wordRange = getWordRangeOnLine(
                lineInfo.text,
                Math.min(startColumn, Math.max(lineInfo.length - 1, 0))
              );
              const startOffset = Math.min(Math.max(startColumn, 0), lineInfo.length);
              if (wordRange.endOffset > startOffset) {
                endColumn = wordRange.endOffset;
              }
            }

            let end = Math.min(endLineInfo.from + endColumn, endLineInfo.to);
            if (end <= start && lineInfo.to > lineInfo.from) {
              end = Math.min(start + 1, lineInfo.to);
            }

            if (end > start) {
              builder.add(
                start,
                end,
                Decoration.mark({
                  class: "cm-typst-error-squiggle",
                  attributes: { title: diagnostic.message },
                })
              );
            } else {
              builder.add(
                lineInfo.from,
                lineInfo.from,
                Decoration.line({
                  class: "cm-typst-error-line",
                  attributes: { title: diagnostic.message },
                })
              );
            }
          }

          return builder.finish();
        };

        const buildCommentDecorations = (
          state: typeof EditorState.prototype,
          nextComments: ReviewComment[]
        ) => {
          const builder = new RangeSetBuilder<typeof Decoration.prototype>();

          for (const comment of nextComments) {
            const clampedStartLine = Math.min(
              Math.max(1, comment.start_line || 1),
              state.doc.lines
            );
            const startLineInfo = state.doc.line(clampedStartLine);
            const startColumn = Math.max((comment.start_column ?? 1) - 1, 0);
            const start = Math.min(startLineInfo.from + startColumn, startLineInfo.to);

            let endLine = clampedStartLine;
            let endColumn = comment.end_column ?? comment.start_column ?? 1;

            if (comment.end_line) {
              endLine = Math.min(Math.max(1, comment.end_line), state.doc.lines);
              const endLineInfo = state.doc.line(endLine);
              endColumn = Math.max((comment.end_column ?? 1) - 1, 0);
              const end = Math.min(endLineInfo.from + endColumn, endLineInfo.to);
              if (end > start) {
                builder.add(
                  start,
                  end,
                  Decoration.mark({
                    class: "cm-comment-highlight",
                    attributes: { "data-comment-id": comment.id },
                  })
                );
              }
            } else {
              if (startLineInfo.length > startColumn) {
                const end = Math.min(start + 1, startLineInfo.to);
                builder.add(
                  start,
                  end,
                  Decoration.mark({
                    class: "cm-comment-highlight",
                    attributes: { "data-comment-id": comment.id },
                  })
                );
              }
            }
          }

          return builder.finish();
        };

        const commentsField = StateField.define({
          create: () => Decoration.none,
          update: (decorations, transaction) => {
            let nextDecorations = decorations;
            if (nextDecorations?.map) {
              nextDecorations = nextDecorations.map(transaction.changes);
            }
            for (const effect of transaction.effects) {
              if (effect.is(setCommentsEffect)) {
                return buildCommentDecorations(transaction.state, effect.value);
              }
            }
            return nextDecorations;
          },
          provide: (field) => EditorView.decorations.from(field),
        });

        const diagnosticsField = StateField.define({
          create: () => Decoration.none,
          update: (decorations, transaction) => {
            let nextDecorations = decorations;
            if (nextDecorations?.map) {
              nextDecorations = nextDecorations.map(transaction.changes);
            }
            for (const effect of transaction.effects) {
              if (effect.is(setDiagnosticsEffect)) {
                return buildDiagnosticDecorations(transaction.state, effect.value);
              }
            }
            return nextDecorations;
          },
          provide: (field) => EditorView.decorations.from(field),
        });

        const state = EditorState.create({
          doc: initialContent,
          extensions: [
            lineNumbers(),
            history(),
            typstSyntax(),
            keymap.of([...readOnlyKeymap, saveKeymap]),
            updateListener,
            createEditorTheme(),
            EditorView.lineWrapping,
            readOnly ? EditorView.editable.of(false) : [],
            diagnosticsField,
            commentsField,
            popoverField,
          ],
        });

        viewRef.current = new EditorView({
          state,
          parent: editorRef.current!,
        });

        diagnosticsDispatchRef.current = (nextDiagnostics: EditorDiagnostic[]) => {
          if (!viewRef.current) return;
          viewRef.current.dispatch({
            effects: setDiagnosticsEffect.of(nextDiagnostics),
          });
        };
        diagnosticsDispatchRef.current(diagnosticsRef.current);

        commentsDispatchRef.current = (nextComments: ReviewComment[]) => {
          if (!viewRef.current) return;
          viewRef.current.dispatch({
            effects: setCommentsEffect.of(nextComments),
          });
        };
        commentsDispatchRef.current(commentsRef.current);

        // Comment popover state
        let activePopover: { commentId: string; widget: any } | null = null;

        const showPopover = (commentId: string, from: number) => {
          if (activePopover) {
            if (activePopover.commentId === commentId) {
              // Dismiss if clicking same comment
              activePopover.widget.detach();
              activePopover = null;
              return;
            }
            activePopover.widget.detach();
            activePopover = null;
          }

          const comment = commentsRef.current.find((c) => c.id === commentId);
          if (!comment) return;

          const popoverContent = document.createElement("div");
          popoverContent.className = "cm-comment-popover";
          popoverContent.innerHTML = `
            <div style="font-size:11px;color:#666;margin-bottom:6px;">
              Line ${comment.start_line}${comment.end_line && comment.end_line !== comment.start_line ? `-${comment.end_line}` : ""} • ${comment.user_id.slice(0, 8)}
            </div>
            <div style="font-size:13px;line-height:1.4;">${comment.content}</div>
          `;

          const widget = Decoration.widget({
            widget: new (class {
              dom = popoverContent;
              toDOM() { return this.dom; }
              eq() { return false; }
              get estimatedHeight() { return null; }
              get lineBreaks() { return 0; }
              compare(other: any) { return 0; }
            })(),
            side: 1,
            block: false,
          });

          const tr = viewRef.current!.state.update({
            effects: StateEffect.appendConfig.of([
              Decoration.set([widget.range(from)]),
            ]),
          });

          viewRef.current!.dispatch(tr);
          activePopover = { commentId, widget: { ...widget, detach: () => {
            if (viewRef.current) {
              viewRef.current.dispatch({
                effects: StateEffect.appendConfig.of([
                  Decoration.set([], false),
                ]),
              });
            }
          }}};
        };

        // Comment click handler
        viewRef.current.dom.addEventListener("click", (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const commentMark = target.closest("[data-comment-id]");
          if (commentMark) {
            e.stopPropagation();
            const commentId = commentMark.getAttribute("data-comment-id");
            const comment = commentsRef.current.find((c) => c.id === commentId);
            if (comment) {
              // Dismiss popover on clicking same area
              if (activePopover?.commentId === commentId) {
                activePopover.widget.detach();
                activePopover = null;
                return;
              }
              // Show popover at start of comment
              const startLine = viewRef.current!.state.doc.line(comment.start_line);
              const startPos = startLine.from + (comment.start_column || 1) - 1;
              showPopover(commentId!, startPos);
              if (onCommentClickRef.current) {
                onCommentClickRef.current(comment);
              }
            }
          } else {
            // Dismiss on click elsewhere
            if (activePopover) {
              activePopover.widget.detach();
              activePopover = null;
            }
          }
        });

        didInitRef.current = true;
      })
      .catch((error) => {
        console.error("Failed to load editor:", error);
      });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
        diagnosticsDispatchRef.current = null;
        commentsDispatchRef.current = null;
        didInitRef.current = false;
      }
    };
  }, [theme, readOnly]);

  useEffect(() => {
    diagnosticsDispatchRef.current?.(diagnostics);
  }, [diagnostics]);

  useEffect(() => {
    commentsDispatchRef.current?.(comments);
  }, [comments]);

  return (
    <div
      ref={editorRef}
      className={`h-full w-full ${readOnly ? "cursor-not-allowed" : ""}`}
      title={readOnly ? "Read-only mode" : ""}
    />
  );
}
