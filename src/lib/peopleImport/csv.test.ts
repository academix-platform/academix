import { describe, expect, it } from "vitest";

import { decodeCsv, parseCsv } from "./csv";

const utf8 = (text: string) => new TextEncoder().encode(text);

describe("parseCsv", () => {
  it("reads rows and cells", () => {
    expect(parseCsv("الاسم,رقم الهوية\r\nليلى حداد,023456783\r\n")).toEqual([
      ["الاسم", "رقم الهوية"],
      ["ليلى حداد", "023456783"],
    ]);
  });

  it("keeps leading zeros, since every cell is text", () => {
    expect(parseCsv("id\n000000018")[1]).toEqual(["000000018"]);
  });

  it("reads quoted cells with commas, quotes and line breaks", () => {
    expect(parseCsv('name,address\n"Haddad, Lina","Street ""5""\nRamallah"')).toEqual([
      ["name", "address"],
      ["Haddad, Lina", 'Street "5"\nRamallah'],
    ]);
  });

  it("finds a semicolon or tab separator, as Arabic Excel can write", () => {
    expect(parseCsv("الاسم;الصف\nليلى;السابع ب")).toEqual([
      ["الاسم", "الصف"],
      ["ليلى", "السابع ب"],
    ]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("decodeCsv", () => {
  it("reads UTF-8, with or without the byte order mark", () => {
    expect(decodeCsv(utf8("الاسم"))).toBe("الاسم");
    expect(decodeCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("الاسم")]))).toBe("الاسم");
  });

  it("reads Windows Arabic, which older Excel saves", () => {
    // "سلام" in Windows-1256.
    expect(decodeCsv(new Uint8Array([0xd3, 0xe1, 0xc7, 0xe3]))).toBe("سلام");
  });
});
