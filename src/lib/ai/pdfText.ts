import "server-only";

import { createRequire } from "module";
import path from "path";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);

const ensurePdfJsTextGlobals = () => {
  const globalScope = globalThis as Record<string, unknown>;

  if (!globalScope.DOMMatrix) globalScope.DOMMatrix = SimpleDOMMatrix;
  if (!globalScope.ImageData) globalScope.ImageData = SimpleImageData;
  if (!globalScope.Path2D) globalScope.Path2D = SimplePath2D;
};

class SimpleDOMMatrix {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: number[]) {
    if (Array.isArray(init)) {
      [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    }
  }
}

class SimpleImageData {}
class SimplePath2D {}

ensurePdfJsTextGlobals();

type PDFParseConstructor = new (options: {
  data: Buffer | Uint8Array;
}) => {
  getText: () => Promise<{ text?: string }>;
  destroy: () => Promise<void>;
};

const { PDFParse } = require("pdf-parse") as {
  PDFParse: PDFParseConstructor & { setWorker: (workerSrc?: string) => string };
};

PDFParse.setWorker(
  pathToFileURL(
    path.join(
      process.cwd(),
      "node_modules",
      "pdf-parse",
      "dist",
      "pdf-parse",
      "cjs",
      "pdf.worker.mjs",
    ),
  ).href,
);

export async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const text = (result.text ?? "").replace(/\s+/g, " ").trim();

    if (!text) {
      throw new Error("No readable text could be extracted from this PDF.");
    }

    return text;
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
