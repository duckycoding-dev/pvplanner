/** Read and parse a JSON file at an absolute path. Throws if missing. */
export async function readJson<T = unknown>(absPath: string): Promise<T> {
  const file = Bun.file(absPath);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${absPath}`);
  }
  return (await file.json()) as T;
}
