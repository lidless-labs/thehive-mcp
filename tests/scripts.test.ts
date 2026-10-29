import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const proxmoxInstaller = readFileSync("scripts/proxmox_install.sh", "utf8");

describe("Proxmox installer", () => {
  it("should reference the current repository and service names", () => {
    expect(proxmoxInstaller).toContain("https://github.com/lidless-labs/thehive-mcp.git");
    expect(proxmoxInstaller).toContain("/opt/thehive-mcp");
    expect(proxmoxInstaller).toContain("thehive-mcp.service");
    expect(proxmoxInstaller).not.toContain("thehive-mcp-ts");
  });

  it("should write TheHive configuration without interpolating user input into a heredoc", () => {
    expect(proxmoxInstaller).toContain("env THEHIVE_URL_VAL=");
    expect(proxmoxInstaller).toContain('printf "THEHIVE_API_KEY=%s\\n"');
    expect(proxmoxInstaller).not.toContain("ENVEOF");
  });
});

  it("runs the service as an unprivileged account with bounded writable directories", () => {
    expect(proxmoxInstaller).toContain("useradd --system");
    for (const setting of ["User=thehive-mcp", "Group=thehive-mcp", "NoNewPrivileges=true",
      "ProtectSystem=strict", "ProtectHome=true", "PrivateTmp=true", "CapabilityBoundingSet=",
      "StateDirectory=thehive-mcp", "CacheDirectory=thehive-mcp", "RuntimeDirectory=thehive-mcp",
      "Environment=HOME=/var/lib/thehive-mcp", "Environment=XDG_CACHE_HOME=/var/cache/thehive-mcp"]) {
      expect(proxmoxInstaller).toContain(setting);
    }
    expect(proxmoxInstaller).not.toContain("MemoryDenyWriteExecute=true");
    expect(proxmoxInstaller).toContain("chmod 600 /opt/thehive-mcp/.env");
  });


describe("reviewed installer source", () => {
  const commit = "a1".repeat(20);
  const validation = proxmoxInstaller.match(/# Reviewed source\n([\s\S]*?)# Pre-flight/)?.[1] ?? "";
  const checkout = proxmoxInstaller.match(/# Fetch reviewed source\n([\s\S]*?)# Configure service/)?.[1] ?? "";
  it.each(["", "main", "v1.2.0", "a".repeat(39), "g".repeat(40), commit + ";exit 0", commit + "\n"])(
    "rejects unreviewed or invalid source ref %j before any host work", (ref) => {
      const result = spawnSync("bash", ["-e", "-c", validation], {
        env: { PATH: process.env.PATH, THEHIVE_SOURCE_COMMIT: ref }, encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("reviewed 40-character hexadecimal commit");
    });
  it("accepts a full commit and validates before querying or creating containers", () => {
    const result = spawnSync("bash", ["-e", "-c", validation + '\nprintf "%s" "$THEHIVE_SOURCE_COMMIT"'], {
      env: { PATH: process.env.PATH, THEHIVE_SOURCE_COMMIT: commit.toUpperCase() }, encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(commit);
    expect(proxmoxInstaller.indexOf("# Reviewed source")).toBeGreaterThan(0);
    expect(proxmoxInstaller.indexOf("# Reviewed source")).toBeLessThan(proxmoxInstaller.indexOf("NEXT_CTID="));
    expect(proxmoxInstaller.indexOf("# Reviewed source")).toBeLessThan(proxmoxInstaller.indexOf("pct create"));
  });
  function checkoutHarness(actualCommit: string, failFetch = false) {
    const dir = mkdtempSync(join(tmpdir(), "thehive-source-test-"));
    const trace = join(dir, "trace");
    try {
      // All external commands in this extracted block are shell functions.
      // No Proxmox, Git remote, npm lifecycle, filesystem install, or service runs.
      const result = spawnSync("bash", ["-e", "-c", `
        git() {
          printf 'git %s\\n' "$*" >> "$TRACE"
          if [[ "$1" == fetch && "$FAIL_FETCH" == true ]]; then return 7; fi
          if [[ "$1" == rev-parse ]]; then printf '%s\\n' "$ACTUAL_COMMIT"; fi
        }
        npm() { printf 'npm %s\\n' "$*" >> "$TRACE"; }
        cd() { :; }
        pct() { while [[ "$1" != -- ]]; do shift; done; shift; "$@"; }
        export -f git npm cd pct
        ${checkout}
      `], { env: { PATH: process.env.PATH, TRACE: trace, ACTUAL_COMMIT: actualCommit,
        THEHIVE_SOURCE_COMMIT: commit, CTID: "fixture", FAIL_FETCH: String(failFetch) }, encoding: "utf8" });
      let calls = "";
      try { calls = readFileSync(trace, "utf8"); } catch { /* no commands reached */ }
      return { ...result, calls };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  it("fetches only the reviewed commit from the canonical repository and verifies before npm", () => {
    const result = checkoutHarness(commit);
    expect(result.status).toBe(0);
    expect(result.calls).toContain("git remote add origin https://github.com/lidless-labs/thehive-mcp.git");
    expect(result.calls).toContain(`git fetch --depth 1 origin ${commit}`);
    expect(result.calls).toContain("git checkout --detach FETCH_HEAD");
    expect(result.calls).toContain("git rev-parse --verify HEAD^{commit}");
    expect(result.calls).toContain("npm ci");
    expect(result.calls).toContain("npm run build");
    expect(result.calls.indexOf("git rev-parse")).toBeLessThan(result.calls.indexOf("npm ci"));
  });
  it.each(["hash mismatch", "fetch failure"])("stops before npm on %s", (failure) => {
    const result = checkoutHarness(failure === "hash mismatch" ? "b".repeat(40) : commit, failure === "fetch failure");
    expect(result.status).not.toBe(0);
    expect(result.calls).not.toContain("npm");
    if (failure === "hash mismatch") expect(result.stderr).toContain("Source commit verification failed");
  });
});
