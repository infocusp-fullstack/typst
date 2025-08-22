/* eslint-disable @typescript-eslint/no-explicit-any */

import { StreamLanguage } from "@codemirror/language";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

// Safe tokenizer for Typst
const typstTokenizer = {
  startState: () => ({}),
  token: (stream: any, state: any) => {
    if (stream.eatSpace()) return null;

    if (stream.match("/*")) {
      state.inComment = true;
      return "comment";
    }
    if (state.inComment) {
      if (stream.match("*/")) {
        state.inComment = false;
      } else {
        stream.next();
      }
      return "comment";
    }

    // Comments
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    // Headings
    if (stream.match(/^=+\s/)) {
      return "heading";
    }

    // Bold: **text**
    if (stream.peek() === "*" && stream.match("**", false)) {
      stream.next();
      stream.next(); // consume **
      while (!stream.eol()) {
        if (stream.match("**", true)) return "strong";
        stream.next();
      }
      return "strong";
    }

    // Emphasis: *text*
    if (stream.peek() === "*") {
      stream.next(); // consume *
      while (!stream.eol()) {
        if (stream.peek() === "*") {
          stream.next();
          return "emphasis";
        }
        stream.next();
      }
      return "emphasis";
    }

    // Strikethrough: ~~text~~
    if (stream.peek() === "~" && stream.match("~~", false)) {
      stream.next();
      stream.next();
      while (!stream.eol()) {
        if (stream.match("~~", true)) return "strikethrough";
        stream.next();
      }
      return "strikethrough";
    }

    // Raw text: `code`
    if (stream.peek() === "`") {
      stream.next();
      while (!stream.eol()) {
        if (stream.peek() === "`") {
          stream.next();
          return "literal";
        }
        stream.next();
      }
      return "literal";
    }

    // Code block (```...```)
    if (stream.match("```")) {
      while (!stream.eol()) {
        if (stream.match("```", true)) return "literal";
        stream.next();
      }
      return "literal";
    }

    // Strings
    if (stream.match(/"/)) {
      let escaped = false;
      while (!stream.eol()) {
        const ch = stream.next();
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          return "string";
        }
      }
      return "string";
    }

    // Numbers
    if (stream.match(/^-?\d*\.?\d+/)) {
      return "number";
    }

    // URLs
    if (stream.match(/https?:\/\/[^\s]+/)) {
      return "url";
    }

    // Labels
    if (stream.match(/@[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return "labelName";
    }

    // Keywords
    const keywords = [
      "#let",
      "#show",
      "#set",
      "#import",
      "#include",
      "#if",
      "#else",
      "#for",
      "#while",
      "#true",
      "#false",
      "#edu",
      "#work",
      "#project",
      "#extracurriculars",
    ];

    for (const keyword of keywords) {
      if (stream.match(keyword)) {
        return "keyword";
      }
    }

    // Variables/functions
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return "variableName";
    }

    // Skip other characters
    stream.next();
    return null;
  },
};

// --- Highlight Styles ---
const typstHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "#e11d48", fontWeight: "bold" },
  { tag: tags.strong, color: "#19181f", fontWeight: "bold" },
  { tag: tags.emphasis, color: "#19181f", fontWeight: "bold" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "#94a3b8" },
  { tag: tags.keyword, color: "#4b69c6", fontWeight: "bold" },
  { tag: tags.atom, color: "#059669" },
  { tag: tags.bool, color: "#dc2626" },
  { tag: tags.url, color: "#38bdf8", textDecoration: "underline" },
  { tag: tags.labelName, color: "#7c2d12" },
  { tag: tags.inserted, color: "#059669" },
  { tag: tags.deleted, color: "#dc2626" },
  { tag: tags.literal, color: "#0891b2", fontStyle: "italic" },
  { tag: tags.string, color: "#22c55e" },
  { tag: tags.number, color: "#f87171" },
  {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    color: "#e11d48",
  },
  { tag: tags.definition(tags.variableName), color: "#0ea5e9" },
  { tag: tags.local(tags.variableName), color: "#14b8a6" },
  { tag: [tags.typeName, tags.namespace], color: "#7c3aed" },
  { tag: tags.className, color: "#c084fc" },
  { tag: [tags.special(tags.variableName), tags.macroName], color: "#ec4899" },
  { tag: tags.definition(tags.propertyName), color: "#22d3ee" },
  { tag: tags.comment, color: "#6b7280", fontStyle: "italic" },
  { tag: tags.meta, color: "#6b7280" },
  { tag: tags.invalid, color: "#ef4444", textDecoration: "underline" },
]);

// --- Exports ---
export function createTypstSyntax(): Extension[] {
  return [
    StreamLanguage.define(typstTokenizer),
    syntaxHighlighting(typstHighlightStyle),
  ];
}

export const typstSyntax = createTypstSyntax;
