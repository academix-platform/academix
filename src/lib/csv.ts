export type CsvColumn<T> = {
  header: string;
  value: (row: T) => unknown;
};

function csvEscape(value: unknown) {
  const rawText = String(value ?? "");
  const text =
    /^[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return `"${text.replace(/"/g, '""')}"`;
}

export function generateCsv<T>(columns: CsvColumn<T>[], rows: T[]) {
  const headerRow = columns.map((column) => csvEscape(column.header)).join(",");

  const dataRows = rows.map((row) =>
    columns.map((column) => csvEscape(column.value(row))).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

export function createCsvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
