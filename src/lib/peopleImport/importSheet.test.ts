import { readSheet } from "read-excel-file/node";
import { describe, expect, it } from "vitest";

import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";
import { buildXlsx } from "../xlsx";

import { applyColumnMapping, fieldsFor, findHeaderRow, type ImportKind } from "./columns";
import {
  mappingFromHeaders,
  studentSheetRows,
  teacherSheetRows,
  type FieldLabels,
  type SheetStudent,
  type SheetTeacher,
} from "./importSheet";
import { parseSex } from "./rowFlags";
import { readSubjects } from "./subjects";

const labelsFor = (messages: typeof ar, kind: ImportKind) =>
  Object.fromEntries(fieldsFor(kind).map((field) => [field, (messages.peopleImport.fields as Record<string, string>)[field]])) as FieldLabels;
const sexesFor = (messages: typeof ar) => ({ MALE: messages.peopleImport.sheet.male, FEMALE: messages.peopleImport.sheet.female });

const lina: SheetStudent = {
  name: "ليلى حداد",
  nationalId: "023456783",
  className: "السابع ب",
  sex: "FEMALE",
  birthday: new Date("2013-09-14T00:00:00Z"),
  bloodType: "O+",
  address: "رام الله",
  phone: null,
  email: null,
  parent: { name: "سامي حداد", phone: "0599111111", email: "sami@mail.ps" },
};
const yousef: SheetStudent = { ...lina, name: "يوسف عودة", nationalId: null, sex: "MALE", birthday: null, parent: null };

const sara: SheetTeacher = {
  name: "سارة نصر",
  email: "sara@school.ps",
  phone: "0599222222",
  sex: "FEMALE",
  birthday: null,
  bloodType: null,
  address: null,
  subjects: [
    { name: "رياضيات", level: 7 },
    { name: "علوم", level: 8 },
  ],
};

/** Writes the rows to an .xlsx file and reads them back the way the import does. */
const roundTrip = async (kind: ImportKind, rows: string[][], labels: FieldLabels) => {
  const sheet = (await readSheet(Buffer.from(buildXlsx(rows, { rightToLeft: true })))) as unknown[][];
  const headerIndex = findHeaderRow(sheet);
  const mapping = mappingFromHeaders(kind, sheet[headerIndex], labels);
  expect(mapping).not.toBeNull();
  return applyColumnMapping(sheet.slice(headerIndex + 1), mapping!, headerIndex + 2);
};

describe("the students import sheet", () => {
  it.each([
    ["Arabic", ar],
    ["English", en],
  ])("comes back through the import as the same people, in %s", async (_, messages) => {
    const labels = labelsFor(messages, "students");
    const rows = studentSheetRows([lina, yousef], labels, sexesFor(messages));

    const imported = await roundTrip("students", rows, labels);

    expect(imported).toEqual([
      {
        sourceRow: 2,
        values: {
          studentName: "ليلى حداد",
          nationalId: "023456783",
          className: "السابع ب",
          sex: sexesFor(messages).FEMALE,
          birthday: "2013-09-14",
          bloodType: "O+",
          address: "رام الله",
          parentName: "سامي حداد",
          parentPhone: "0599111111",
          parentEmail: "sami@mail.ps",
        },
      },
      {
        sourceRow: 3,
        values: { studentName: "يوسف عودة", className: "السابع ب", sex: sexesFor(messages).MALE, bloodType: "O+", address: "رام الله" },
      },
    ]);
    expect(parseSex(imported[0].values.sex!)).toBe("FEMALE");
    expect(parseSex(imported[1].values.sex!)).toBe("MALE");
  });

  it("is just the headers for a school with no students", () => {
    expect(studentSheetRows([], labelsFor(ar, "students"), sexesFor(ar))).toEqual([
      fieldsFor("students").map((field) => labelsFor(ar, "students")[field]),
    ]);
  });
});

describe("the teachers import sheet", () => {
  it("writes each subject with its grade, so the import matches it again", async () => {
    const labels = labelsFor(ar, "teachers");
    const rows = teacherSheetRows([sara], labels, sexesFor(ar));

    const [row] = await roundTrip("teachers", rows, labels);

    expect(row.values).toEqual({
      teacherName: "سارة نصر",
      email: "sara@school.ps",
      phone: "0599222222",
      sex: "أنثى",
      subjects: "رياضيات 7، علوم 8",
    });
    const schoolSubjects = [
      { id: 1, name: "رياضيات", gradeId: 7, level: 7 },
      { id: 2, name: "رياضيات", gradeId: 8, level: 8 },
      { id: 3, name: "علوم", gradeId: 8, level: 8 },
    ];
    expect(readSubjects(row.values.subjects, schoolSubjects).matched.map((s) => s.id)).toEqual([1, 3]);
  });
});

describe("mappingFromHeaders", () => {
  const labels = labelsFor(ar, "students");

  it("reads the import's own headers in any order, leaving empty headers out", () => {
    expect(mappingFromHeaders("students", ["الصف", "", "اسم الطالب"], labels)).toEqual(["className", "unknown", "studentName"]);
  });

  it("matches headers written with other alef and taa forms", () => {
    expect(mappingFromHeaders("students", ["إسم الطالب", "رقم الهويه"], labels)).toEqual(["studentName", "nationalId"]);
  });

  it("leaves any other sheet to the column reader", () => {
    expect(mappingFromHeaders("students", ["اسم الطالب", "ملاحظات"], labels)).toBeNull();
    expect(mappingFromHeaders("students", ["اسم الطالب", "اسم الطالب"], labels)).toBeNull();
    expect(mappingFromHeaders("students", ["الصف", "رقم الهوية"], labels)).toBeNull();
  });
});
