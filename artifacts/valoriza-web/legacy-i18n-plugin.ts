import ts from "typescript";
import type { Plugin } from "vite";

const arabic = /[\u0600-\u06ff]/;
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** Localize the imported application's legacy inline copy without changing
 * business identifiers, object keys, imports, or comparisons. New UI should use
 * useI18n().t directly. This runs before the React compiler in dev AND builds. */
export function collectLegacyStrings(code: string, fileName: string) {
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true,
    fileName.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const strings = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
      if (arabic.test(node.text)) strings.add(normalize(node.text));
    }
    if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map((span, i) => `{${i}}${span.literal.text}`).join("");
      if (arabic.test(text)) strings.add(normalize(text));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...strings];
}

export default function legacyI18n(): Plugin {
  return {
    name: "valoriza-legacy-i18n",
    enforce: "pre",
    transform(code, id) {
      const fileName = id.split("?")[0];
      if (!fileName.includes("/src/") || !fileName.endsWith(".tsx") ||
          /\/lib\/(i18n|legacy-i18n)\./.test(fileName)) return;
      const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      type Edit = { start: number; end: number; replacement: string };
      const edits: Edit[] = [];
      const visit = (node: ts.Node) => {
        if (ts.isStringLiteral(node) && node.text === "rtl" && ts.isJsxAttribute(node.parent) && node.parent.name.getText(source) === "dir") {
          edits.push({ start: node.getStart(source), end: node.end, replacement: "{__valorizaDirection()}" });
          return;
        }
        if (ts.isStringLiteral(node) && /^ar(?:-[A-Z]{2})?$/.test(node.text) &&
            (ts.isCallExpression(node.parent) || ts.isNewExpression(node.parent))) {
          const callee = node.parent.expression.getText(source);
          if (/toLocale|Intl\.(NumberFormat|DateTimeFormat)/.test(callee)) {
            edits.push({ start: node.getStart(source), end: node.end, replacement: "__valorizaLocale()" });
            return;
          }
        }
        // Never translate keys, business comparisons, or dictionary lookups.
        if (ts.isStringLiteral(node) && (
          (ts.isPropertyAssignment(node.parent) && node.parent.name === node) ||
          ts.isElementAccessExpression(node.parent) ||
          ts.isBinaryExpression(node.parent) ||
          ts.isImportDeclaration(node.parent)
        )) return;
        if (ts.isTemplateExpression(node)) {
          const text = node.head.text + node.templateSpans.map((span, i) => `{${i}}${span.literal.text}`).join("");
          if (arabic.test(text)) {
            const values = node.templateSpans.map(span => span.expression.getText(source)).join(", ");
            edits.push({ start: node.getStart(source), end: node.end,
              replacement: `__valorizaText(${JSON.stringify(normalize(text))}, [${values}])` });
            return;
          }
        }
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node))
            && arabic.test(node.text)) {
          const call = `__valorizaText(${JSON.stringify(normalize(node.text))})`;
          const jsx = ts.isJsxText(node) || ts.isJsxAttribute(node.parent);
          edits.push({ start: node.getStart(source), end: node.end, replacement: jsx ? `{${call}}` : call });
          return;
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      if (!edits.length) return;
      let result = code;
      for (const edit of edits.sort((a, b) => b.start - a.start)) {
        result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
      }
      return {
        code: `import { translateLegacyText as __valorizaText, currentDirection as __valorizaDirection, currentLocale as __valorizaLocale } from "@/lib/legacy-i18n";\n${result}`,
        map: null,
      };
    },
  };
}
