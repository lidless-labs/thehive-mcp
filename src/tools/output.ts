/** Upper bound on the text returned by any single tool call. */
export const MAX_OUTPUT_CHARS = 100_000;

/** Upper bound on concurrent upstream requests issued by a single bulk tool call. */
export const BULK_CONCURRENCY = 5;

/**
 * Serialize a tool result as indented JSON and cap its length so one large
 * upstream response cannot flood the caller's context.
 */
export function formatJson(value: unknown, maxChars: number = MAX_OUTPUT_CHARS): string {
  const text = JSON.stringify(value, null, 2) ?? "null";
  if (text.length <= maxChars) {
    return text;
  }
  const omitted = text.length - maxChars;
  return `${text.slice(0, maxChars)}\n... [output truncated: ${omitted} characters omitted. Narrow the request with filters or a smaller limit.]`;
}

/** Cap free-form text (such as an error message) at a fixed length. */
export function truncateText(text: string, maxChars: number = MAX_OUTPUT_CHARS): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}... [truncated]`;
}

/**
 * Run `worker` over `items` with at most `concurrency` calls in flight and
 * return one settled result per item, in input order.
 */
export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  worker: (item: T) => Promise<R>,
  concurrency: number = BULK_CONCURRENCY,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index] as T) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(runners);
  return results;
}
