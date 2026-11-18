import { describe, expect, it } from "vitest";

import { readSubjects, splitSubjects, type SchoolSubject } from "./subjects";

const subjects: SchoolSubject[] = [
  { id: 1, name: "رياضيات", gradeId: 70, level: 7 },
  { id: 2, name: "رياضيات", gradeId: 80, level: 8 },
  { id: 3, name: "علوم", gradeId: 70, level: 7 },
  { id: 4, name: "English", gradeId: 80, level: 8 },
  { id: 5, name: "Math 2", gradeId: 90, level: 9 },
];

const read = (cell: string, choices = {}) => readSubjects(cell, subjects, choices);

describe("splitSubjects", () => {
  it("splits on commas, Arabic commas, semicolons, slashes and new lines", () => {
    expect(splitSubjects("رياضيات 7، علوم; English / فن\nدين")).toEqual(["رياضيات 7", "علوم", "English", "فن", "دين"]);
  });

  it("drops empty parts and repeats", () => {
    expect(splitSubjects(" علوم ,, علوم ,")).toEqual(["علوم"]);
    expect(splitSubjects("")).toEqual([]);
    expect(splitSubjects(undefined)).toEqual([]);
  });
});

describe("readSubjects", () => {
  it("matches a subject by name and grade", () => {
    expect(read("رياضيات 7").matched.map((s) => s.id)).toEqual([1]);
    expect(read("رياضيات 8").matched.map((s) => s.id)).toEqual([2]);
  });

  it("reads the grade in Eastern Arabic digits, and with a dash or brackets", () => {
    expect(read("رياضيات ٧").matched.map((s) => s.id)).toEqual([1]);
    expect(read("رياضيات - 8").matched.map((s) => s.id)).toEqual([2]);
    expect(read("رياضيات (8)").matched.map((s) => s.id)).toEqual([2]);
  });

  it("matches a name without a grade when only one grade has it", () => {
    expect(read("علوم").matched.map((s) => s.id)).toEqual([3]);
  });

  it("ignores case and Arabic spelling differences in the name", () => {
    expect(read("english").matched.map((s) => s.id)).toEqual([4]);
    expect(read("رياضيّات 7").matched.map((s) => s.id)).toEqual([1]);
  });

  it("offers every grade when a name without a grade matches several", () => {
    const result = read("رياضيات");

    expect(result.matched).toEqual([]);
    expect(result.unknown).toEqual([{ text: "رياضيات", candidates: [subjects[0], subjects[1]] }]);
  });

  it("flags a subject the school doesn't have, and a grade that doesn't have it", () => {
    expect(read("فن").unknown).toEqual([{ text: "فن", candidates: [] }]);
    expect(read("علوم 8").unknown).toEqual([{ text: "علوم 8", candidates: [subjects[2]] }]);
  });

  it("matches a subject whose own name ends in a number", () => {
    expect(read("Math 2").matched.map((s) => s.id)).toEqual([5]);
  });

  it("reads several subjects from one cell, each once", () => {
    const result = read("رياضيات 7، علوم، رياضيات 7, فن");

    expect(result.matched.map((s) => s.id)).toEqual([1, 3]);
    expect(result.unknown.map((u) => u.text)).toEqual(["فن"]);
  });

  it("uses the subject the admin picked for an unclear one", () => {
    const result = read("رياضيات، فن", { رياضيات: 2, فن: 3 });

    expect(result.matched.map((s) => s.id)).toEqual([2, 3]);
    expect(result.unknown).toEqual([]);
  });

  it("leaves out a subject the admin removed", () => {
    const result = read("رياضيات 7، فن", { فن: null });

    expect(result.matched.map((s) => s.id)).toEqual([1]);
    expect(result.unknown).toEqual([]);
  });

  it("lets the admin remove a subject that matched", () => {
    expect(read("رياضيات 7، علوم", { علوم: null }).matched.map((s) => s.id)).toEqual([1]);
  });

  it("still flags the subject when the admin's pick isn't one of the school's", () => {
    expect(read("فن", { فن: 999 }).unknown).toEqual([{ text: "فن", candidates: [] }]);
  });
});
