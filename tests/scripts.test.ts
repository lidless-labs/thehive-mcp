import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const proxmoxInstaller = readFileSync("scripts/proxmox_install.sh", "utf8");

describe("Proxmox installer", () => {
  it("should reference the current repository and service names", () => {
    expect(proxmoxInstaller).toContain("https://github.com/solomonneas/thehive-mcp.git");
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
