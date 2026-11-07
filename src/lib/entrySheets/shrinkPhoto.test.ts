import { describe, expect, it } from "vitest";
import { MAX_EDGE, fitWithin } from "./shrinkPhoto";

describe("fitWithin", () => {
  it("shrinks a 12 MP phone photo so its long edge is the maximum", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: MAX_EDGE });
  });

  it("shrinks a landscape photo by its width", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_EDGE, height: 1500 });
  });

  it("never enlarges a small photo", () => {
    expect(fitWithin(1200, 900)).toEqual({ width: 1200, height: 900 });
  });

  it("rounds to whole pixels", () => {
    expect(fitWithin(3001, 4001)).toEqual({ width: 1500, height: MAX_EDGE });
  });
});
