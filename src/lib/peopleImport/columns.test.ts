import { describe, expect, it } from "vitest";

import {
  applyColumnMapping,
  columnDescriptionsSchema,
  describeColumns,
  fieldsFor,
  findHeaderRow,
  type ColumnDescription,
} from "./columns";

// A small file from "another school": Arabic headers, a split name, and a
// phone stored as a number, so Excel dropped its leading zero.
const header = ["الاسم الأول", "اسم العائلة", "رقم الهوية", "الصف", "الجنس", "تاريخ الميلاد", "جوال ولي الأمر", "البريد"];
const rows: unknown[][] = [
  ["محمد", "الخطيب", "123456782", "السابع أ", "ذكر", new Date("2013-04-02"), 599123456, "m.khatib@example.com"],
  ["ليلى", "حداد", 23456783, "السابع ب", "أنثى", new Date("2013-09-14"), "0569876543", ""],
  ["يوسف", "عودة", "٠٠٠٠٠٠٠١٨", "السابع أ", "ذكر", "2013-01-30", "0597777777", "yousef.odeh@example.com"],
];

const everyValue = rows.flat().flatMap((cell) => {
  if (cell instanceof Date) return [cell.toISOString(), cell.toISOString().slice(0, 10), String(cell.getFullYear())];
  const text = String(cell ?? "").trim();
  return text ? [text, ...text.split(/[\s@.]+/).filter((part) => part.length >= 3)] : [];
});

describe("describeColumns", () => {
  it("describes each column without any of its values", () => {
    const descriptions = describeColumns(header, rows);
    const sent = JSON.stringify(descriptions);

    for (const value of everyValue) expect(sent, value).not.toContain(value);
  });

  it("keeps the headers, which name the columns", () => {
    expect(describeColumns(header, rows).map((column) => column.header)).toEqual(header);
  });

  it("describes what kind of values a column holds", () => {
    const [firstName, , nationalId, className, sex, birthday, phone, email] = describeColumns(header, rows);

    expect(firstName).toMatchObject({ filled: 3, empty: 0, arabicText: 100, averageWords: 1 });
    expect(nationalId).toMatchObject({ nationalIds: 100, phones: 0, digits: 0 });
    expect(className).toMatchObject({ arabicText: 100, averageWords: 2, distinct: 2 });
    expect(sex).toMatchObject({ distinct: 2 });
    expect(birthday).toMatchObject({ dates: 100 });
    expect(phone).toMatchObject({ phones: 100 });
    expect(email).toMatchObject({ filled: 2, empty: 1, emails: 100 });
  });

  it("counts an ID starting with 5 as an ID, not as a phone without its 0", () => {
    const [ids] = describeColumns(["رقم الهوية"], [["599123452"], [599123452]]);
    expect(ids).toMatchObject({ nationalIds: 100, phones: 0 });
  });

  it("keeps phones as phones, even one that Excel stored without its 0", () => {
    const [phones] = describeColumns(["جوال"], [["0599123452"], [599123456]]);
    expect(phones).toMatchObject({ nationalIds: 0, phones: 100 });
  });

  it("never counts short numbers, such as row numbers, as IDs", () => {
    const [rowNumbers] = describeColumns(["م"], [[18], [27], [1]]);
    expect(rowNumbers).toMatchObject({ nationalIds: 0, digits: 100 });
  });

  it("leaves out a header that looks like a value, as in a file with no header row", () => {
    const noHeader = describeColumns(["123456782", "0599123456", "a@b.co", "2013-04-02"], rows);
    expect(noHeader.slice(0, 4).map((column) => column.header)).toEqual(["", "", "", ""]);
  });

  it("shortens very long headers", () => {
    const [column] = describeColumns(["ا".repeat(300)], [["x"]]);
    expect(column.header.length).toBeLessThanOrEqual(60);
  });

  it("describes a column that is empty in every row", () => {
    const [column] = describeColumns(["ملاحظات"], [[""], [null], ["  "]]);
    expect(column).toMatchObject({ filled: 0, empty: 3, distinct: 0 });
  });
});

describe("columnDescriptionsSchema", () => {
  it("accepts the descriptions the browser makes", () => {
    expect(columnDescriptionsSchema.safeParse(describeColumns(header, rows)).success).toBe(true);
  });

  it("refuses anything added to a description, such as the column's values", () => {
    const [first, ...rest] = describeColumns(header, rows);
    const withValues = [{ ...first, values: ["محمد"] }, ...rest];
    expect(columnDescriptionsSchema.safeParse(withValues).success).toBe(false);
  });

  it("refuses a header longer than the browser sends", () => {
    const [first] = describeColumns(header, rows);
    expect(columnDescriptionsSchema.safeParse([{ ...first, header: "x".repeat(61) }]).success).toBe(false);
  });

  it("refuses columns out of order", () => {
    const [first, second] = describeColumns(header, rows);
    expect(columnDescriptionsSchema.safeParse([second, first]).success).toBe(false);
  });
});

describe("findHeaderRow", () => {
  it("skips empty rows and title rows above the headers", () => {
    const sheet = [[], ["مدرسة الأمل - كشف الطلاب"], header, ...rows];
    expect(findHeaderRow(sheet)).toBe(2);
  });

  it("is the first row when it has the most filled cells", () => {
    expect(findHeaderRow([header, ...rows])).toBe(0);
  });
});

describe("fieldsFor", () => {
  it("lists the student and parent fields", () => {
    expect(fieldsFor("students")).toEqual(
      expect.arrayContaining(["studentName", "nationalId", "className", "sex", "parentName", "parentPhone"]),
    );
  });
});

describe("applyColumnMapping", () => {
  const mapping = ["studentName", "studentName", "nationalId", "className", "sex", "birthday", "parentPhone", "parentEmail"] as const;

  it("reads each row's fields from the chosen columns", () => {
    const [first] = applyColumnMapping(rows, [...mapping]);
    expect(first.sourceRow).toBe(2);
    expect(first.values).toMatchObject({
      studentName: "محمد الخطيب",
      nationalId: "123456782",
      className: "السابع أ",
      sex: "ذكر",
      birthday: "2013-04-02",
      parentPhone: "0599123456",
      parentEmail: "m.khatib@example.com",
    });
  });

  it("joins name parts in column order", () => {
    expect(applyColumnMapping(rows, [...mapping])[1].values.studentName).toBe("ليلى حداد");
  });

  it("turns Eastern Arabic digits into Western ones", () => {
    expect(applyColumnMapping(rows, [...mapping])[2].values.nationalId).toBe("000000018");
  });

  it("leaves a field out when its cell is empty", () => {
    expect(applyColumnMapping(rows, [...mapping])[1].values).not.toHaveProperty("parentEmail");
  });

  it("ignores unknown columns", () => {
    const [first] = applyColumnMapping(rows, ["studentName", "unknown", "unknown", "unknown", "unknown", "unknown", "unknown", "unknown"]);
    expect(Object.keys(first.values)).toEqual(["studentName"]);
  });

  it("puts the leading zero back on a phone Excel stored as a number", () => {
    expect(applyColumnMapping(rows, [...mapping])[0].values.parentPhone).toBe("0599123456");
  });

  it("skips rows with nothing in the chosen columns", () => {
    expect(applyColumnMapping([...rows, ["", null, "  "]], [...mapping])).toHaveLength(3);
  });
});

// Keeps the description type honest: only numbers, the header and the index.
const _onlyStatistics: Record<keyof ColumnDescription, "number" | "string"> = {
  index: "number",
  header: "string",
  filled: "number",
  empty: "number",
  distinct: "number",
  digits: "number",
  shortestDigits: "number",
  longestDigits: "number",
  nationalIds: "number",
  phones: "number",
  dates: "number",
  emails: "number",
  bloodTypes: "number",
  arabicText: "number",
  latinText: "number",
  averageWords: "number",
};
void _onlyStatistics;
