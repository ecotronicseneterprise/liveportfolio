export async function register() {
  // The --localstorage-file Node.js flag (launched without a valid path) creates a
  // global localStorage that exists but lacks Storage interface methods, causing
  // "localStorage.getItem is not a function" during SSR. Patch it to a no-op.
  const g = globalThis as Record<string, unknown>
  const ls = g.localStorage as { getItem?: unknown } | undefined
  if (ls !== undefined && typeof ls.getItem !== 'function') {
    g.localStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    }
  }
}
