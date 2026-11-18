import { describe, expect, it } from "vitest";
import { checkNationalId, nationalIdProblem } from "./nationalId";

describe("checkNationalId", () => {
  it("accepts an ID whose check digit is right", () => {
    expect(checkNationalId("123456782")).toEqual({ ok: true, id: "123456782" });
  });

  it("pads a short ID with leading zeros, as Excel drops them", () => {
    // 000000018: the 1 is doubled to 2, and 2 + 8 = 10.
    expect(checkNationalId("18")).toEqual({ ok: true, id: "000000018" });
    expect(checkNationalId("000000018")).toEqual({ ok: true, id: "000000018" });
    expect(checkNationalId("23456783")).toEqual({ ok: true, id: "023456783" });
  });

  it("accepts Eastern Arabic and Persian digits", () => {
    expect(checkNationalId("١٢٣٤٥٦٧٨٢")).toEqual({ ok: true, id: "123456782" });
    expect(checkNationalId("۱۲۳۴۵۶۷۸۲")).toEqual({ ok: true, id: "123456782" });
    expect(checkNationalId("١٢٣٤56782")).toEqual({ ok: true, id: "123456782" });
  });

  it("ignores spaces around the ID and invisible direction marks", () => {
    expect(checkNationalId("  123456782 ")).toEqual({ ok: true, id: "123456782" });
    expect(checkNationalId("‏123456782‎")).toEqual({ ok: true, id: "123456782" });
  });

  it("refuses every single changed digit", () => {
    const valid = "123456782";
    for (let position = 0; position < valid.length; position++) {
      for (let digit = 0; digit <= 9; digit++) {
        if (String(digit) === valid[position]) continue;
        const changed = valid.slice(0, position) + digit + valid.slice(position + 1);
        expect(checkNationalId(changed), changed).toEqual({ ok: false, reason: "checkDigit" });
      }
    }
  });

  it("refuses an empty ID or one longer than 9 digits", () => {
    expect(checkNationalId("")).toEqual({ ok: false, reason: "format" });
    expect(checkNationalId("   ")).toEqual({ ok: false, reason: "format" });
    expect(checkNationalId("1234567820")).toEqual({ ok: false, reason: "format" });
  });

  it("refuses letters and symbols instead of dropping them", () => {
    expect(checkNationalId("12345678a")).toEqual({ ok: false, reason: "format" });
    expect(checkNationalId("1234a56782")).toEqual({ ok: false, reason: "format" });
    expect(checkNationalId("123-456-782")).toEqual({ ok: false, reason: "format" });
    expect(checkNationalId("123456782.0")).toEqual({ ok: false, reason: "format" });
  });

  it("refuses an ID of all zeros", () => {
    expect(checkNationalId("0")).toEqual({ ok: false, reason: "format" });
    expect(checkNationalId("000000000")).toEqual({ ok: false, reason: "format" });
  });
});

describe("nationalIdProblem", () => {
  it("names what is wrong, for the form to show", () => {
    expect(nationalIdProblem("")).toBe("nationalIdRequired");
    expect(nationalIdProblem("  ")).toBe("nationalIdRequired");
    expect(nationalIdProblem("12a")).toBe("nationalIdFormat");
    expect(nationalIdProblem("123456789")).toBe("nationalIdCheckDigit");
  });

  it("finds nothing wrong with a valid ID", () => {
    expect(nationalIdProblem("123456782")).toBeNull();
    expect(nationalIdProblem("١٨")).toBeNull();
  });
});
