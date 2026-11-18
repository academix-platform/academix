import "server-only";

import { getTranslations } from "next-intl/server";

import { buildXlsx, XLSX_CONTENT_TYPE } from "@/lib/xlsx";

import { fieldsFor, type ImportKind } from "./columns";
import type { FieldLabels, SexLabels } from "./importSheet";

/** The column headers and sex words in the admin's language. */
export const sheetLabels = async (kind: ImportKind): Promise<{ labels: FieldLabels; sexes: SexLabels; sheetName: string; rtl: boolean }> => {
  const t = await getTranslations("peopleImport");
  const labels = Object.fromEntries(fieldsFor(kind).map((field) => [field, t(`fields.${field}`)])) as FieldLabels;
  return {
    labels,
    sexes: { MALE: t("sheet.male"), FEMALE: t("sheet.female") },
    sheetName: kind === "students" ? t("sheet.studentsSheetName") : t("sheet.teachersSheetName"),
    rtl: t("sheet.direction") === "rtl",
  };
};

/** The rows as an .xlsx download, with columns wide enough to read. */
export const xlsxResponse = (rows: string[][], options: { fileName: string; sheetName: string; rtl: boolean }) => {
  const columnWidths = rows[0].map((_, column) =>
    Math.min(40, Math.max(12, ...rows.map((row) => (row[column]?.length ?? 0) + 2))),
  );
  const bytes = buildXlsx(rows, { sheetName: options.sheetName, rightToLeft: options.rtl, columnWidths });
  return new Response(bytes, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${options.fileName}"`,
      // People's data: never kept by a cache along the way.
      "Cache-Control": "no-store",
    },
  });
};
