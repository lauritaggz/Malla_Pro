import { createElement, Fragment, useMemo } from "react";
import { parseMarkdownBlocks } from "../../utils/legalMarkdown";

/**
 * @param {Array<{ type: string, value?: string, href?: string, children?: unknown[] }>} nodes
 * @param {string} keyPrefix
 */
function renderInline(nodes, keyPrefix = "i") {
  if (!Array.isArray(nodes)) return null;
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") return node.value;
    if (node.type === "code") {
      return createElement("code", { key, className: "legal-inline-code" }, node.value);
    }
    if (node.type === "strong") {
      return createElement("strong", { key }, renderInline(node.children, key));
    }
    if (node.type === "link") {
      const href = String(node.href || "");
      const external = /^https?:\/\//i.test(href) || href.startsWith("mailto:");
      return createElement(
        "a",
        {
          key,
          href,
          ...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
        renderInline(node.children, key)
      );
    }
    return null;
  });
}

/**
 * Renderiza Markdown legal a elementos React (sin dangerouslySetInnerHTML).
 */
export default function LegalDocument({ markdown }) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown || ""), [markdown]);

  return createElement(
    "div",
    { className: "legal-content" },
    blocks.map((block, index) => {
      const key = `b-${index}`;
      if (block.type === "hr") {
        return createElement("hr", { key, className: "legal-hr" });
      }
      if (block.type === "heading") {
        const tag = block.level === 1 ? "h2" : block.level === 2 ? "h2" : "h3";
        return createElement(
          tag,
          { key, id: block.id, className: `legal-h${block.level === 3 ? 3 : 2}` },
          renderInline(block.children, key)
        );
      }
      if (block.type === "paragraph") {
        return createElement("p", { key }, renderInline(block.children, key));
      }
      if (block.type === "blockquote") {
        return createElement(
          "blockquote",
          { key, className: "legal-quote" },
          createElement("p", null, renderInline(block.children, key))
        );
      }
      if (block.type === "ul" || block.type === "ol") {
        return createElement(
          block.type,
          { key, className: "legal-list" },
          block.items.map((item, itemIndex) =>
            createElement("li", { key: `${key}-li-${itemIndex}` }, renderInline(item, `${key}-${itemIndex}`))
          )
        );
      }
      if (block.type === "table") {
        return createElement(
          "div",
          { key, className: "legal-table-wrap" },
          createElement(
            "table",
            { className: "legal-table" },
            createElement(
              "thead",
              null,
              createElement(
                "tr",
                null,
                block.header.map((cell, cellIndex) =>
                  createElement("th", { key: `${key}-th-${cellIndex}` }, renderInline(cell, `${key}-th-${cellIndex}`))
                )
              )
            ),
            createElement(
              "tbody",
              null,
              block.rows.map((row, rowIndex) =>
                createElement(
                  "tr",
                  { key: `${key}-tr-${rowIndex}` },
                  row.map((cell, cellIndex) =>
                    createElement(
                      "td",
                      { key: `${key}-td-${rowIndex}-${cellIndex}` },
                      renderInline(cell, `${key}-td-${rowIndex}-${cellIndex}`)
                    )
                  )
                )
              )
            )
          )
        );
      }
      return createElement(Fragment, { key });
    })
  );
}
