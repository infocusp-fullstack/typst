"use client";

import { useEffect, useRef, useCallback } from "react";
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

export function EditorPane({
  initialContent,
  theme,
  onChange,
  onSave,
  readOnly = false,
}: {
  initialContent: string;
  theme: string;
  onChange: (doc: string) => void;
  onSave: () => void;
  readOnly?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

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

        // Custom syntax highlighting colors (Monokai)
        ".cm-strong": {
          fontWeight: "bold",
          color: isDark ? "#f92672" : "#d81159", // pinkish
        },
        ".cm-em": {
          fontStyle: "italic",
          color: isDark ? "#fd971f" : "#c2410c", // orange
        },
        ".cm-heading": {
          fontWeight: "bold",
          color: isDark ? "#a6e22e" : "#15803d", // green
        },
        ".cm-keyword": {
          color: isDark ? "#66d9ef" : "#2563eb", // blue
        },
        ".cm-string": {
          color: isDark ? "#e6db74" : "#b45309", // yellow
        },
        ".cm-comment": {
          color: isDark ? "#75715e" : "#6b7280", // gray
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
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !readOnly) {
        onChange(update.state.doc.toString());
      }
    });

    const saveKeymap = {
      key: "Mod-s",
      run: () => {
        if (!readOnly) {
          onSave();
        }
        return true;
      },
    };

    // Disable editing in read-only mode
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
        // Disable editing in read-only mode
        readOnly ? EditorView.editable.of(false) : [],
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [theme, readOnly]);

  return (
    <div
      ref={editorRef}
      className={`h-full ${readOnly ? "cursor-not-allowed" : ""}`}
      title={readOnly ? "Read-only mode" : ""}
    />
  );
}
