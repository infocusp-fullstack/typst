import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export function typstSyntax(): Extension {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: "hsl(var(--primary))" },
      { tag: t.string, color: "hsl(var(--success))" },
      { tag: t.number, color: "hsl(var(--destructive))" },
      {
        tag: t.comment,
        color: "hsl(var(--muted-foreground))",
        fontStyle: "italic",
      },
      { tag: t.operator, color: "hsl(var(--foreground))" },
      { tag: t.punctuation, color: "hsl(var(--muted-foreground))" },
      { tag: t.function(t.variableName), color: "hsl(var(--primary))" },
      { tag: t.variableName, color: "hsl(var(--foreground))" },
      { tag: t.definition(t.variableName), color: "hsl(var(--primary))" },
      { tag: t.definition(t.propertyName), color: "hsl(var(--primary))" },
      { tag: t.propertyName, color: "hsl(var(--success))" },
    ]),
  );
}
