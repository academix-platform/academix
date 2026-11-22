import "server-only";

import type { ColumnChoice, ColumnDescription, ImportKind } from "@/lib/peopleImport/columns";

import {
  COLUMN_MAPPING_SYSTEM_INSTRUCTION,
  buildColumnMappingPrompt,
  columnMappingSchema,
  parseColumnMappingReply,
} from "./peopleReadingPrompt";

import { groqJson } from "./groqChat";

/** Strict mode needs every object closed to extra keys. */
const strictSchema = (kind: ImportKind) => {
  const schema = columnMappingSchema(kind);
  return {
    ...schema,
    additionalProperties: false,
    properties: {
      columns: {
        ...schema.properties.columns,
        items: { ...schema.properties.columns.items, additionalProperties: false },
      },
    },
  };
};

/**
 * Asks Groq which field each spreadsheet column holds, from the headers and
 * column descriptions only: no cell value is ever sent.
 *
 * Groq doesn't keep inference requests by default.
 * Sources: https://console.groq.com/docs/structured-outputs
 * https://console.groq.com/docs/api-reference#chat-create
 * https://console.groq.com/docs/your-data
 */
export async function mapColumnsWithGroq(
  kind: ImportKind,
  columns: ColumnDescription[],
): Promise<{ mapping: ColumnChoice[]; model: string }> {
  const read = await groqJson({
    system: COLUMN_MAPPING_SYSTEM_INSTRUCTION,
    text: buildColumnMappingPrompt(kind, columns),
    schema: strictSchema(kind),
    name: "column_mapping",
    strict: true,
  });
  return { mapping: parseColumnMappingReply(read.text, kind, columns.length), model: read.model };
}
