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
