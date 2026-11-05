import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue } from "./saveQueue";

describe("createSaveQueue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves each question after its own delay instead of cancelling the other", async () => {
    const save = vi.fn(async () => true);
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", true);
    await vi.advanceTimersByTimeAsync(500);
    queue.set(2, "b", true);
    await vi.advanceTimersByTimeAsync(1000);

    expect(save).toHaveBeenCalledWith(1, "a");
    expect(save).toHaveBeenCalledWith(2, "b");
  });

  it("only saves the latest value when one question changes quickly", async () => {
    const save = vi.fn(async () => true);
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", true);
    queue.set(1, "ab", true);
    await vi.advanceTimersByTimeAsync(1000);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(1, "ab");
  });

  it("flush waits for every pending and in-flight save", async () => {
    let resolveSlow!: (ok: boolean) => void;
    const save = vi.fn((key: number) =>
      key === 1 ? new Promise<boolean>((r) => (resolveSlow = r)) : Promise.resolve(true),
    );
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", true);
    await vi.advanceTimersByTimeAsync(1000); // question 1 now in flight
    queue.set(2, "b", true); // question 2 still waiting on its timer

    let flushed = false;
    const flushing = queue.flush().then((ok) => (flushed = ok));
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledWith(2, "b");
    expect(flushed).toBe(false);

    resolveSlow(true);
    await flushing;
    expect(flushed).toBe(true);
    expect(queue.entries()).toEqual([]);
  });

  it("keeps failed saves pending and reports them from flush", async () => {
    const save = vi.fn(async () => false);
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", true);
    expect(await queue.flush()).toBe(false);
    expect(queue.entries()).toEqual([[1, "a"]]);
  });

  it("does not drop a newer edit made while the older one was saving", async () => {
    let resolveSave!: (ok: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>((r) => (resolveSave = r)));
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", true);
    await vi.advanceTimersByTimeAsync(1000);
    queue.set(1, "ab", false);
    resolveSave(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(queue.entries()).toEqual([[1, "ab"]]);
  });

  it("without autosave, saves nothing until flushed", async () => {
    const save = vi.fn(async () => true);
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();

    await queue.flush();
    expect(save).toHaveBeenCalledWith(1, "a");
  });

  it("treats a throwing save as a failure", async () => {
    const save = vi.fn(async () => {
      throw new Error("network");
    });
    const queue = createSaveQueue(save, 1000);

    queue.set(1, "a", false);
    expect(await queue.flush()).toBe(false);
  });
});
