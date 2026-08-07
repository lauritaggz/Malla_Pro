/**
 * Utilidades para documentos legales en Markdown (sin dependencias).
 * El HTML no se inyecta: se genera un árbol de nodos React-safe.
 */

/**
 * @param {string} text
 */
export function slugifyHeading(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "seccion";
}

/**
 * @param {string} markdown
 */
export function extractDocumentMeta(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  let title = "";
  let version = "";
  let updatedAt = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!title && /^#\s+/.test(line) && !/^##\s+/.test(line)) {
      title = line.replace(/^#\s+/, "").trim();
      continue;
    }
    const versionMatch = line.match(/^\*\*Versión:\*\*\s*(.+)$/i);
    if (versionMatch && !version) {
      version = versionMatch[1].trim();
      continue;
    }
    const updatedMatch = line.match(/^\*\*Última actualización:\*\*\s*(.+)$/i);
    if (updatedMatch && !updatedAt) {
      updatedAt = updatedMatch[1].trim();
      continue;
    }
    if (title && version && updatedAt) break;
  }

  return { title, version, updatedAt };
}

/**
 * Extrae TOC desde headings ## o # numerados (excluye el H1 del título).
 * @param {string} markdown
 */
export function extractToc(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  /** @type {{ id: string, text: string, level: number }[]} */
  const toc = [];
  const used = new Map();
  let sawTitle = false;

  for (const raw of lines) {
    const match = raw.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    if (!sawTitle && level === 1) {
      sawTitle = true;
      continue;
    }
    // Incluir secciones: ## 1. ... o # 4. ...
    if (level > 3) continue;
    let id = slugifyHeading(text.replace(/^\d+\.\s*/, ""));
    const count = used.get(id) || 0;
    used.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    toc.push({ id, text, level });
  }

  return toc;
}

/**
 * Asigna ids estables a líneas de heading (misma lógica que extractToc).
 * @param {string} markdown
 * @returns {Map<number, string>} lineIndex -> id
 */
export function buildHeadingIdMap(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const map = new Map();
  const used = new Map();
  let sawTitle = false;

  lines.forEach((raw, index) => {
    const match = raw.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (!match) return;
    const level = match[1].length;
    const text = match[2].trim();
    if (!sawTitle && level === 1) {
      sawTitle = true;
      return;
    }
    let id = slugifyHeading(text.replace(/^\d+\.\s*/, ""));
    const count = used.get(id) || 0;
    used.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    map.set(index, id);
  });

  return map;
}

/**
 * Parsea inline markdown limitado: **bold**, `code`, [text](url), escapes.
 * @param {string} text
 * @returns {Array<{ type: string, value?: string, href?: string, children?: unknown[] }>}
 */
export function parseInline(text) {
  const src = String(text || "");
  /** @type {Array<{ type: string, value?: string, href?: string, children?: unknown[] }>} */
  const nodes = [];
  let i = 0;
  let buf = "";

  const flush = () => {
    if (buf) {
      nodes.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < src.length) {
    if (src[i] === "\\" && i + 1 < src.length) {
      buf += src[i + 1];
      i += 2;
      continue;
    }

    if (src.startsWith("**", i)) {
      const end = src.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        nodes.push({
          type: "strong",
          children: parseInline(src.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    if (src[i] === "`") {
      const end = src.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (src[i] === "[") {
      const closeBracket = src.indexOf("]", i + 1);
      if (closeBracket !== -1 && src[closeBracket + 1] === "(") {
        const closeParen = src.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          flush();
          const label = src.slice(i + 1, closeBracket);
          const href = src.slice(closeBracket + 2, closeParen).trim();
          nodes.push({
            type: "link",
            href,
            children: parseInline(label),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }

    buf += src[i];
    i += 1;
  }

  flush();
  return nodes;
}

/**
 * @param {string} markdown
 * @returns {Array<object>}
 */
export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const headingIds = buildHeadingIdMap(markdown);
  /** @type {Array<object>} */
  const blocks = [];
  let i = 0;
  let skippedTitle = false;
  let skippedMeta = false;

  const isBlank = (line) => !line || !line.trim();

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // Skip document H1 + version/updated meta (shown in page header)
    if (!skippedTitle) {
      const h1 = line.match(/^#\s+(.+)/);
      if (h1 && !line.startsWith("##")) {
        skippedTitle = true;
        i += 1;
        continue;
      }
    }

    if (!skippedMeta) {
      if (/^\*\*Versión:\*\*/i.test(line.trim()) || /^\*\*Última actualización:\*\*/i.test(line.trim())) {
        i += 1;
        // consume consecutive meta lines
        while (
          i < lines.length &&
          (/^\*\*Versión:\*\*/i.test(lines[i].trim()) ||
            /^\*\*Última actualización:\*\*/i.test(lines[i].trim()) ||
            isBlank(lines[i]))
        ) {
          if (
            /^\*\*Versión:\*\*/i.test(lines[i].trim()) ||
            /^\*\*Última actualización:\*\*/i.test(lines[i].trim())
          ) {
            i += 1;
            continue;
          }
          if (isBlank(lines[i])) {
            i += 1;
            // peek if more meta
            if (
              i < lines.length &&
              (/^\*\*Versión:\*\*/i.test(lines[i].trim()) ||
                /^\*\*Última actualización:\*\*/i.test(lines[i].trim()))
            ) {
              continue;
            }
            skippedMeta = true;
            break;
          }
          break;
        }
        skippedMeta = true;
        continue;
      }
      skippedMeta = true;
    }

    if (/^---+\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+?)\s*$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = headingIds.get(i) || slugifyHeading(text);
      blocks.push({
        type: "heading",
        level,
        id,
        children: parseInline(text),
      });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({
        type: "blockquote",
        children: parseInline(quoteLines.join(" ")),
      });
      continue;
    }

    if (/^\|/.test(line.trim()) && i + 1 < lines.length && /^\|?\s*[-:| ]+\s*\|/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && /^\|/.test(lines[i].trim())) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const parseRow = (row) =>
        row
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => parseInline(cell.trim()));
      const header = parseRow(tableLines[0]);
      const body = tableLines.slice(2).map(parseRow);
      blocks.push({ type: "table", header, rows: body });
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items = [];
      while (
        i < lines.length &&
        (ordered ? /^\d+\.\s+/.test(lines[i]) : /^[-*]\s+/.test(lines[i]))
      ) {
        const itemText = lines[i].replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, "");
        // continuations indented
        i += 1;
        let full = itemText;
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]) &&
          !/^[-*]\s+/.test(lines[i]) &&
          !/^\d+\.\s+/.test(lines[i]) &&
          !/^#{1,3}\s+/.test(lines[i])
        ) {
          full += ` ${lines[i].trim()}`;
          i += 1;
        }
        items.push(parseInline(full));
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    // paragraph
    const para = [];
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !(/^\|/.test(lines[i].trim()) && i + 1 < lines.length && /^\|?\s*[-:| ]+\s*\|/.test(lines[i + 1] || ""))
    ) {
      // Skip footer signature lines that repeat title (optional keep as para)
      para.push(lines[i].trim());
      i += 1;
    }
    if (para.length) {
      blocks.push({ type: "paragraph", children: parseInline(para.join(" ")) });
    }
  }

  return blocks;
}
