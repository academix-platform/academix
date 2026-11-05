/**
 * Tracks unsaved answers per question. With autosave on, each question is
 * saved `delayMs` after its last change, independently of other questions.
 * A value stays pending until a save of that exact value succeeds.
 */
export const createSaveQueue = <K, V>(
  save: (key: K, value: V) => Promise<boolean>,
  delayMs: number,
) => {
  const pending = new Map<K, V>();
  const timers = new Map<K, ReturnType<typeof setTimeout>>();
  const inFlight = new Map<K, Promise<boolean>>();

  const clearTimer = (key: K) => {
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
  };

  const run = (key: K): Promise<boolean> => {
    clearTimer(key);
    if (!pending.has(key)) return Promise.resolve(true);
    const value = pending.get(key) as V;

    const saving = save(key, value)
      .catch(() => false)
      .then((ok) => {
        // Keep a newer edit made while this save was running.
        if (ok && pending.get(key) === value) pending.delete(key);
        if (inFlight.get(key) === saving) inFlight.delete(key);
        return ok;
      });
    inFlight.set(key, saving);
    return saving;
  };

  return {
    set(key: K, value: V, autoSave: boolean) {
      pending.set(key, value);
      clearTimer(key);
      if (autoSave) {
        timers.set(key, setTimeout(() => void run(key), delayMs));
      }
    },

    /** Saves everything now; resolves true once nothing is left unsaved. */
    async flush() {
      // Start everything not already saving, then wait for all of it. A value
      // that changed during an in-flight save gets one more attempt.
      const idle = [...pending.keys()].filter((key) => !inFlight.has(key));
      await Promise.all([...inFlight.values(), ...idle.map(run)]);
      await Promise.all([...pending.keys()].map(run));
      return pending.size === 0;
    },

    /** Retries pending answers that aren't already waiting on a timer. */
    retryPending() {
      for (const key of pending.keys()) {
        if (!timers.has(key) && !inFlight.has(key)) void run(key);
      }
    },

    entries: () => [...pending.entries()],

    dispose() {
      for (const key of [...timers.keys()]) clearTimer(key);
    },
  };
};

export type SaveQueue<K, V> = ReturnType<typeof createSaveQueue<K, V>>;
