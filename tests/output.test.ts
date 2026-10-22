import { describe, it, expect } from "vitest";
import {
  formatJson,
  settleWithConcurrency,
  truncateText,
} from "../src/tools/output.js";

describe("formatJson", () => {
  it("returns indented JSON when under the limit", () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("truncates and annotates output over the limit", () => {
    const text = formatJson({ data: "y".repeat(500) }, 100);
    expect(text.startsWith('{\n  "data": "yyy')).toBe(true);
    expect(text).toContain("output truncated");
  });

  it("serializes undefined without throwing", () => {
    expect(formatJson(undefined)).toBe("null");
  });
});

describe("truncateText", () => {
  it("leaves short text alone and caps long text", () => {
    expect(truncateText("abc", 10)).toBe("abc");
    expect(truncateText("abcdef", 3)).toBe("abc... [truncated]");
  });
});

describe("settleWithConcurrency", () => {
  it("never exceeds the concurrency limit and keeps input order", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await settleWithConcurrency(
      [1, 2, 3, 4, 5, 6, 7, 8],
      async (n) => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight--;
        return n * 2;
      },
      3,
    );

    expect(peak).toBeLessThanOrEqual(3);
    expect(results.map((r) => (r.status === "fulfilled" ? r.value : null))).toEqual([
      2, 4, 6, 8, 10, 12, 14, 16,
    ]);
  });

  it("records rejections without stopping other items", async () => {
    const results = await settleWithConcurrency([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });

    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });

  it("handles an empty list", async () => {
    expect(await settleWithConcurrency([], async () => 1)).toEqual([]);
  });
});
