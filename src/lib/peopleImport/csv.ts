// Reading CSV files in the browser. read-excel-file reads .xlsx only, so CSV
// is read here, with no extra dependency. Every cell stays text, so leading
// zeros in IDs and phones are kept.

/**
 * The file's text. Excel saves UTF-8, with or without a byte order mark, or,
 * in older Arabic versions, Windows-1256.
 */
export const decodeCsv = (bytes: Uint8Array): string => {
  try {
    // `fatal` makes invalid UTF-8 throw instead of turning into replacement characters.
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1256").decode(bytes);
  }
};

const SEPARATORS = [",", ";", "\t"] as const;

/** The separator used most on the first line, outside quotes. */
const findSeparator = (text: string) => {
  const counts = new Map<string, number>(SEPARATORS.map((s) => [s, 0]));
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1);
  }
  const [mostUsed, uses] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return uses > 0 ? mostUsed : ",";
};

/** Rows of cells, with quoted cells, doubled quotes and line breaks in quotes. Blank lines are dropped. */
export const parseCsv = (text: string): string[][] => {
  const separator = findSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endRow = () => {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell === "") {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\r" && text[i + 1] === "\n") {
      // The \n ends the row.
    } else if (char === "\n" || char === "\r") {
      endRow();
    } else {
      cell += char;
    }
  }
  endRow();
  return rows;
};
