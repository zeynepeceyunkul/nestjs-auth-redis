/**
 * In-memory Redis mock for E2E tests (get/set/del with EX TTL support).
 * No external package required.
 */
export function createRedisMock(): {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ..._args: unknown[]) => Promise<'OK'>;
  del: (...keys: string[]) => Promise<number>;
} {
  const store = new Map<string, string>();

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string): Promise<'OK'> {
      store.set(key, value);
      return 'OK';
    },
    async del(...keys: string[]): Promise<number> {
      let n = 0;
      for (const key of keys) {
        if (store.delete(key)) n++;
      }
      return n;
    },
  };
}
