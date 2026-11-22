import "server-only";

import type { ColumnChoice, ColumnDescription, ImportKind } from "@/lib/peopleImport/columns";

import { PdfNotSupportedError, aiProvider, geminiModel } from "./geminiModel";
import { groqJson } from "./groqChat";
import { mapColumnsWithGroq } from "./groqPeopleReader";
import { getGeminiClient } from "./geminiSheetReader";
import {
  COLUMN_MAPPING_SYSTEM_INSTRUCTION,
  PEOPLE_READING_SYSTEM_INSTRUCTION,
  buildColumnMappingPrompt,
  buildPeopleReadingPrompt,
  columnMappingSchema,
  parseColumnMappingReply,
  parsePeopleReply,
  peopleReplySchema,
  type PeopleReply,
} from "./peopleReadingPrompt";

/**
 * Asks Gemini which field each spreadsheet column holds, from the headers and
 * column descriptions only: no cell value is ever sent.
 *
 * Uses the Interactions API with `store: false`, as the entry sheet reader
 * does, so Google doesn't keep the request.
 * Sources: https://aistudio.google.com/docs/structured-output
 * https://aistudio.google.com/docs/logs-datasets
 */
export async function mapColumnsWithGemini(
  kind: ImportKind,
  columns: ColumnDescription[],
): Promise<{ mapping: ColumnChoice[]; model: string }> {
  const gemini = getGeminiClient();
  const model = geminiModel();

  const interaction = await gemini.interactions.create({
    model,
    store: false,
    system_instruction: COLUMN_MAPPING_SYSTEM_INSTRUCTION,
    input: [{ type: "text", text: buildColumnMappingPrompt(kind, columns) }],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: columnMappingSchema(kind),
    },
  });

  return { mapping: parseColumnMappingReply(interaction.output_text ?? "", kind, columns.length), model };
}

export type PeopleFileMimeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type PeopleReadInput = {
  file: Buffer;
  mimeType: PeopleFileMimeType;
  kind: ImportKind;
};

/**
 * Reads the people listed in one photo or PDF. The file stays in memory here
 * and is never saved, and `store: false` asks Google not to keep the request
 * either. A PDF goes in whole, as a document, so Gemini reads scanned and
 * handwritten pages with vision.
 *
 * The Groq model that reads spreadsheet columns can't read images, so this
 * uses Gemini, with the same model as every other Gemini module.
 * Sources: https://aistudio.google.com/docs/document-processing
 * https://aistudio.google.com/docs/image-understanding
 * https://aistudio.google.com/docs/interactions-overview
 */
export async function readPeopleFile({ file, mimeType, kind }: PeopleReadInput): Promise<{ reply: PeopleReply; model: string }> {
  if (aiProvider() === "groq") {
    if (mimeType === "application/pdf") throw new PdfNotSupportedError();
    const read = await groqJson({
      system: PEOPLE_READING_SYSTEM_INSTRUCTION,
      text: buildPeopleReadingPrompt(kind),
      image: { data: file, mimeType },
      schema: peopleReplySchema(kind),
      name: "people_reply",
    });
    return { reply: parsePeopleReply(read.text, kind), model: read.model };
  }

  const gemini = getGeminiClient();
  const model = geminiModel();
  const data = file.toString("base64");

  const interaction = await gemini.interactions.create({
    model,
    store: false,
    system_instruction: PEOPLE_READING_SYSTEM_INSTRUCTION,
    input: [
      { type: "text", text: buildPeopleReadingPrompt(kind) },
      mimeType === "application/pdf"
        ? { type: "document", data, mime_type: mimeType }
        : { type: "image", data, mime_type: mimeType },
    ],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: peopleReplySchema(kind),
    },
  });

  return { reply: parsePeopleReply(interaction.output_text ?? "", kind), model };
}

/** Reads the spreadsheet columns with the chosen AI, from headers and column descriptions only. */
export const mapColumns = (kind: ImportKind, columns: ColumnDescription[]) =>
  aiProvider() === "groq" ? mapColumnsWithGroq(kind, columns) : mapColumnsWithGemini(kind, columns);
