import { describe, expect, it } from "vitest";
import {
  extractDocumentMeta,
  extractToc,
  parseMarkdownBlocks,
  slugifyHeading,
} from "./legalMarkdown";

describe("legalMarkdown", () => {
  it("slugify normaliza acentos y extractToc omite el número de sección", () => {
    expect(slugifyHeading("Información que permanece en tu dispositivo")).toBe(
      "informacion-que-permanece-en-tu-dispositivo"
    );
    const toc = extractToc("# Título\n\n# 4. Información que permanece en tu dispositivo\n");
    expect(toc[0].id).toBe("informacion-que-permanece-en-tu-dispositivo");
  });

  it("extrae meta y TOC sin el H1 de título", () => {
    const md = `# Política de Privacidad de Malla Pro

**Versión:** 1.0  
**Última actualización:** 7 de agosto de 2026

## 1. Introducción

Texto.

# 4. Información que permanece en tu dispositivo

Más texto.
`;
    expect(extractDocumentMeta(md)).toEqual({
      title: "Política de Privacidad de Malla Pro",
      version: "1.0",
      updatedAt: "7 de agosto de 2026",
    });
    const toc = extractToc(md);
    expect(toc.map((t) => t.id)).toEqual([
      "introduccion",
      "informacion-que-permanece-en-tu-dispositivo",
    ]);
  });

  it("parsea bloques sin HTML crudo y con strong", () => {
    const blocks = parseMarkdownBlocks(`# Título

**Versión:** 1.0  
**Última actualización:** hoy

## 1. Hola

Esto es **importante** y \`localStorage\`.

- uno
- dos
`);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].id).toBe("hola");
    const para = blocks.find((b) => b.type === "paragraph");
    expect(para.children.some((c) => c.type === "strong")).toBe(true);
    expect(para.children.some((c) => c.type === "code" && c.value === "localStorage")).toBe(true);
  });
});
