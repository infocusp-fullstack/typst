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
      stream.next();
      while (!stream.eol()) {
        if (stream.match("**", true)) return "strong";
        stream.next();
      }
      return "strong";
    }

    // Emphasis: *text*
    if (stream.peek() === "*") {
      stream.next();
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

// --- Theme-Aware Highlight Styles ---
const typstHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "var(--color-heading)", fontWeight: "bold" },
  { tag: tags.strong, color: "var(--color-foreground)", fontWeight: "bold" },
  { tag: tags.emphasis, color: "var(--color-foreground)", fontWeight: "bold" },
  {
    tag: tags.strikethrough,
    textDecoration: "line-through",
    color: "var(--color-muted-foreground)",
  },
  { tag: tags.keyword, color: "var(--color-primary)", fontWeight: "bold" },
  { tag: tags.atom, color: "var(--color-success)" },
  { tag: tags.bool, color: "var(--color-danger)" },
  { tag: tags.url, color: "var(--color-info)", textDecoration: "underline" },
  { tag: tags.labelName, color: "var(--color-warning)" },
  { tag: tags.inserted, color: "var(--color-success)" },
  { tag: tags.deleted, color: "var(--color-danger)" },
  { tag: tags.literal, color: "var(--color-accent)", fontStyle: "italic" },
  { tag: tags.string, color: "var(--color-success)" },
  { tag: tags.number, color: "var(--color-danger)" },
  {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    color: "var(--color-primary)",
  },
  { tag: tags.definition(tags.variableName), color: "var(--color-info)" },
  { tag: tags.local(tags.variableName), color: "var(--color-accent)" },
  { tag: [tags.typeName, tags.namespace], color: "var(--color-purple)" },
  { tag: tags.className, color: "var(--color-pink)" },
  {
    tag: [tags.special(tags.variableName), tags.macroName],
    color: "var(--color-pink)",
  },
  { tag: tags.definition(tags.propertyName), color: "var(--color-cyan)" },
  {
    tag: tags.comment,
    color: "var(--color-muted-foreground)",
    fontStyle: "italic",
  },
  { tag: tags.meta, color: "var(--color-muted-foreground)" },
  {
    tag: tags.invalid,
    color: "var(--color-danger)",
    textDecoration: "underline",
  },
]);

// --- Exports ---
export function createTypstSyntax(): Extension[] {
  return [
    StreamLanguage.define(typstTokenizer),
    syntaxHighlighting(typstHighlightStyle),
  ];
}

export const typstSyntax = createTypstSyntax;
