import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("SOC-4 immutable workflow dependencies", () => {
  it("pins every external workflow action and limits token permissions", () => {
    for (const file of readdirSync(".github/workflows").filter((f) => /\.ya?ml$/.test(f))) {
      const workflow = readFileSync(`.github/workflows/${file}`, "utf8");
      const actions = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)].map((match) => match[1]);
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) expect(action).toMatch(/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/);
      expect(workflow).toMatch(/^permissions:\n  contents: read$/m);
    }
  });
});
