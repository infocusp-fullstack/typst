"use client";

import { EditorView } from "@codemirror/view";
import { useEffect, useRef, useCallback } from "react";

export default function EditorPane({
  initialContent,
  theme,
  onChange,
  onSave,
  readOnly = false,
  canSave = true,
}: {
  initialContent: string;
  theme: string;
  onChange: (doc: string) => void;
  onSave: () => void;
  readOnly?: boolean;
  canSave?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const didInitRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
      },
      { dark: isDark },
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
        const { EditorView, keymap, lineNumbers } = viewPkg;
        const { EditorState } = statePkg;
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
          ],
        });

        viewRef.current = new EditorView({
          state,
          parent: editorRef.current!,
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
        didInitRef.current = false;
      }
    };
  }, [theme, readOnly]);

  return (
    <div
      ref={editorRef}
      className={`h-full w-full ${readOnly ? "cursor-not-allowed" : ""}`}
      title={readOnly ? "Read-only mode" : ""}
    />
  );
}
