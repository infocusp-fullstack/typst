/* eslint-disable @typescript-eslint/no-explicit-any */

import { StreamLanguage } from "@codemirror/language";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

const typstTokenizer = {
  startState: () => ({}),
  token: (stream: any) => {
    // Comments
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    // Multi-line comments
    if (stream.match("/*")) {
      let depth = 1;
      while (!stream.eol()) {
        if (stream.match("/*")) {
          depth++;
        } else if (stream.match("*/")) {
          depth--;
          if (depth === 0) break;
        } else {
          stream.next();
        }
      }
      return "comment";
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
      "let",
      "show",
      "set",
      "import",
      "include",
      "if",
      "else",
      "for",
      "while",
      "in",
      "return",
      "break",
      "continue",
      "true",
      "false",
      "none",
      "auto",
    ];

    for (const keyword of keywords) {
      if (stream.match(keyword)) {
        return "keyword";
      }
    }

    // Headings
    if (stream.match(/^=+\s/)) {
      return "heading";
    }

    // Strong emphasis - with bounds checking
    if (stream.match(/\*\*[^*]+\*\*/)) {
      return "strong";
    }

    // Emphasis - with bounds checking
    if (stream.match(/\*[^*]+\*/)) {
      return "emphasis";
    }

    // Strikethrough - with bounds checking
    if (stream.match(/~~[^~]+~~/)) {
      return "strikethrough";
    }

    // Raw text - with bounds checking
    if (stream.match(/`[^`]+`/)) {
      return "literal";
    }

    // Code blocks - with bounds checking
    if (stream.match(/```/)) {
      let found = false;
      while (!stream.eol()) {
        if (stream.match(/```/)) {
          found = true;
          break;
        }
        stream.next();
      }
      return found ? "literal" : "literal";
    }

    // Strings with proper escaping
    if (stream.match(/"/)) {
      let escaped = false;
      while (!stream.eol()) {
        if (!escaped && stream.match(/"/)) {
          return "string";
        }
        if (!escaped && stream.match(/\\/)) {
          escaped = true;
        } else {
          escaped = false;
        }
        stream.next();
      }
      return "string";
    }

    // Numbers
    if (stream.match(/^-?\d*\.?\d+/)) {
      return "number";
    }

    // URLs - with bounds checking
    if (stream.match(/https?:\/\/[^\s]+/)) {
      return "url";
    }

    // Labels - with bounds checking
    if (stream.match(/@[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return "labelName";
    }

    // Functions and variables - with bounds checking
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return "variableName";
    }

    // Skip whitespace
    if (stream.match(/\s+/)) {
      return null;
    }

    // Skip other characters
    stream.next();
    return null;
  },
};

// --- IMPROVED HIGHLIGHT STYLES ---
const typstHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "#e11d48", fontWeight: "bold" },
  { tag: tags.strong, color: "#1f2937", fontWeight: "bold" },
  { tag: tags.emphasis, color: "#1f2937", fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.keyword, color: "#7c3aed" },
  { tag: tags.atom, color: "#059669" },
  { tag: tags.bool, color: "#dc2626" },
  { tag: tags.url, color: "#2563eb", textDecoration: "underline" },
  { tag: tags.labelName, color: "#7c2d12" },
  { tag: tags.inserted, color: "#059669" },
  { tag: tags.deleted, color: "#dc2626" },
  { tag: tags.literal, color: "#0891b2" },
  { tag: tags.string, color: "#059669" },
  { tag: tags.number, color: "#dc2626" },
  {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    color: "#e11d48",
  },
  { tag: tags.definition(tags.variableName), color: "#0369a1" },
  { tag: tags.local(tags.variableName), color: "#065f46" },
  { tag: [tags.typeName, tags.namespace], color: "#7c3aed" },
  { tag: tags.className, color: "#7c3aed" },
  { tag: [tags.special(tags.variableName), tags.macroName], color: "#be185d" },
  { tag: tags.definition(tags.propertyName), color: "#0369a1" },
  { tag: tags.comment, color: "#6b7280", fontStyle: "italic" },
  { tag: tags.meta, color: "#6b7280" },
  { tag: tags.invalid, color: "#dc2626" },
]);

// --- EXPORT EXTENSIONS ---
export function createTypstSyntax(): Extension[] {
  return [
    StreamLanguage.define(typstTokenizer),
    syntaxHighlighting(typstHighlightStyle),
  ];
}

export const typstSyntax = createTypstSyntax;
