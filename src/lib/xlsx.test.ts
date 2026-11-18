import { readSheet } from "read-excel-file/node";
import { describe, expect, it } from "vitest";

import { buildXlsx, crc32 } from "./xlsx";

const readBack = async (bytes: Uint8Array) => (await readSheet(Buffer.from(bytes))) as unknown[][];

describe("buildXlsx", () => {
  it("writes a sheet that a spreadsheet reader reads back as the same text", async () => {
    const rows = [
      ["اسم الطالب", "رقم الهوية", "هاتف ولي الأمر"],
      ["ليلى حداد", "023456783", "0599111111"],
      ["Omar & <Sons>", "000000018", ""],
    ];

    const sheet = await readBack(buildXlsx(rows, { sheetName: "الطلاب", rightToLeft: true }));

    // Text cells keep their leading zeros.
    expect(sheet).toEqual([
      ["اسم الطالب", "رقم الهوية", "هاتف ولي الأمر"],
      ["ليلى حداد", "023456783", "0599111111"],
      ["Omar & <Sons>", "000000018", null],
    ]);
  });

  it("writes a header-only sheet", async () => {
    expect(await readBack(buildXlsx([["الاسم", "الصف"]]))).toEqual([["الاسم", "الصف"]]);
  });

  it("reaches columns past Z", async () => {
    const row = Array.from({ length: 30 }, (_, i) => `c${i}`);
    expect((await readBack(buildXlsx([row])))[0]).toEqual(row);
  });

  it("drops characters XML can't hold", async () => {
    expect(await readBack(buildXlsx([["a\u0001b"]]))).toEqual([["ab"]]);
  });

  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});
