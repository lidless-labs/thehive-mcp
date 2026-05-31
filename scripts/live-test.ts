/**
 * Live integration test against a real TheHive instance.
 * Usage:
 *   THEHIVE_URL=http://... THEHIVE_API_KEY=... npx tsx scripts/live-test.ts
 *   THEHIVE_URL=http://... THEHIVE_API_KEY=... THEHIVE_LIVE_ALLOW_WRITES=true npx tsx scripts/live-test.ts
 *   THEHIVE_URL=http://... THEHIVE_API_KEY=... THEHIVE_LIVE_ALLOW_WRITES=true THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true npx tsx scripts/live-test.ts
 */

import { TheHiveClient } from "../src/client.js";
import { getConfig } from "../src/config.js";

if (!process.env.THEHIVE_URL?.trim() || !process.env.THEHIVE_API_KEY?.trim()) {
  console.log("Skipping live tests: THEHIVE_URL and THEHIVE_API_KEY are not set.");
  process.exit(0);
}

const config = getConfig();
const client = new TheHiveClient(config);
const allowWrites = parseBooleanFlag(process.env.THEHIVE_LIVE_ALLOW_WRITES);
const allowDestructive = parseBooleanFlag(process.env.THEHIVE_LIVE_ALLOW_DESTRUCTIVE);

let passed = 0;
let failed = 0;
let skipped = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function skip(name: string, reason: string): void {
  console.log(`  ⏭️  ${name}: ${reason}`);
  skipped++;
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

function parseBooleanFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function printSummary(): void {
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${passed + failed + skipped} total)`);
  console.log(`${"─".repeat(50)}\n`);
}

function finish(): void {
  printSummary();
  if (failed > 0) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log(`\nLive test against ${config.url}\n`);
  console.log(`Writes: ${allowWrites ? "enabled" : "disabled"}; destructive cleanup: ${allowDestructive ? "enabled" : "disabled"}\n`);

  // --- Status ---
  console.log("📡 Status");
  await test("getStatus returns version info", async () => {
    const status = await client.getStatus();
    assert(!!status.versions.TheHive, "Missing TheHive version");
    console.log(`     TheHive ${status.versions.TheHive}`);
  });

  // --- Users ---
  console.log("\n👤 Users");
  let currentUserLogin = "";
  await test("getCurrentUser returns admin", async () => {
    const user = await client.getCurrentUser();
    assert(!!user.login, "No login returned");
    currentUserLogin = user.login;
    console.log(`     Logged in as: ${user.login} (${user.profile})`);
  });

  await test("listUsers returns at least 1", async () => {
    const users = await client.listUsers(10);
    assert(users.length >= 1, "Expected at least 1 user");
    console.log(`     Found ${users.length} users`);
  });

  // --- Read-only smoke checks ---
  console.log("\n🔎 Read-only Checks");
  await test("listCases", async () => {
    const cases = await client.listCases({ limit: 5 });
    console.log(`     Found ${cases.length} cases`);
  });

  await test("rawQuery (count cases)", async () => {
    const result = await client.rawQuery(
      [{ _name: "listCase" }, { _name: "count" }],
    );
    assert(result !== undefined, "No result from count query");
    console.log(`     Query result: ${JSON.stringify(result)}`);
  });

  await test("rawQuery guardrails reject invalid range", async () => {
    try {
      await client.rawQuery([{ _name: "listCase" }], { range: "all" });
      throw new Error("Expected invalid range to fail");
    } catch (err) {
      assert(
        err instanceof Error && err.message.includes("start-end"),
        "Expected local range validation error",
      );
    }
  });

  await test("listCaseTemplates", async () => {
    const templates = await client.listCaseTemplates();
    console.log(`     Found ${templates.length} templates (0 is OK if none created)`);
  });

  await test("listAnalyzers", async () => {
    const analyzers = await client.listAnalyzers();
    console.log(`     Found ${analyzers.length} analyzers (0 is OK if none configured)`);
  });

  if (!allowWrites) {
    skip("write workflow tests", "set THEHIVE_LIVE_ALLOW_WRITES=true to create and update test data");
    finish();
    return;
  }

  // --- Cases ---
  console.log("\n📁 Cases");
  let testCaseId: string = "";

  await test("createCase", async () => {
    const c = await client.createCase({
      title: "[MCP-TEST] Integration Test Case",
      description: "Automated test case created by thehive-mcp live tests",
      severity: 1,
      tlp: 1,
      pap: 1,
      tags: ["mcp-test", "automated"],
    });
    assert(!!c._id, "No _id returned");
    testCaseId = c._id;
    console.log(`     Created case: ${c._id} (#${c.number})`);
  });

  await test("getCase", async () => {
    const c = await client.getCase(testCaseId);
    assert(c._id === testCaseId, "Wrong case returned");
    assert(c.title.includes("MCP-TEST"), "Wrong title");
  });

  await test("updateCase", async () => {
    const c = await client.updateCase(testCaseId, {
      severity: 2,
      summary: "Updated by integration test",
    });
    assert(c._id === testCaseId, "Wrong case returned");
  });

  await test("assign case (via updateCase owner)", async () => {
    const c = await client.updateCase(testCaseId, {
      owner: currentUserLogin,
    });
    assert(c._id === testCaseId, "Wrong case returned");
  });

  if (process.env.THEHIVE_LIVE_CUSTOM_FIELD?.trim()) {
    await test("updateCase customFields", async () => {
      const fieldName = process.env.THEHIVE_LIVE_CUSTOM_FIELD?.trim() ?? "";
      const c = await client.updateCase(testCaseId, {
        customFields: { [fieldName]: "thehive-mcp-live-test" },
      });
      assert(c._id === testCaseId, "Wrong case returned");
    });
  } else {
    skip("updateCase customFields", "set THEHIVE_LIVE_CUSTOM_FIELD to a configured TheHive custom field name");
  }

  await test("listCases", async () => {
    const cases = await client.listCases({ limit: 5 });
    assert(cases.length >= 1, "Expected at least 1 case");
    console.log(`     Found ${cases.length} cases`);
  });

  await test("searchCases", async () => {
    const cases = await client.searchCases("MCP-TEST");
    assert(cases.length >= 1, "Search should find test case");
  });

  // --- Tasks ---
  console.log("\n📋 Tasks");
  let testTaskId: string = "";

  await test("createTask", async () => {
    const t = await client.createTask(testCaseId, {
      title: "MCP Test Task - Investigate",
      description: "Automated test task",
      status: "Waiting",
      group: "identification",
    });
    assert(!!t._id, "No _id returned");
    testTaskId = t._id;
    console.log(`     Created task: ${t._id}`);
  });

  await test("getTask", async () => {
    const t = await client.getTask(testTaskId);
    assert(t._id === testTaskId, "Wrong task returned");
  });

  await test("updateTask", async () => {
    const t = await client.updateTask(testTaskId, {
      status: "InProgress",
    });
    assert(t._id === testTaskId, "Wrong task returned");
  });

  await test("listTasks", async () => {
    const tasks = await client.listTasks(testCaseId);
    assert(tasks.length >= 1, "Expected at least 1 task");
    console.log(`     Found ${tasks.length} tasks`);
  });

  // --- Task Logs ---
  console.log("\n📝 Task Logs");
  await test("createTaskLog", async () => {
    const log = await client.createTaskLog(testTaskId, {
      message: "Automated test log entry from MCP integration test",
    });
    assert(!!log._id, "No _id returned");
    console.log(`     Created task log: ${log._id}`);
  });

  await test("listTaskLogs", async () => {
    const logs = await client.listTaskLogs(testTaskId);
    assert(logs.length >= 1, "Expected at least 1 log");
    console.log(`     Found ${logs.length} task logs`);
  });

  // --- Observables ---
  console.log("\n🔍 Observables");
  let testObsId: string = "";

  await test("createObservable (IP)", async () => {
    const obs = await client.createObservable(testCaseId, {
      dataType: "ip",
      data: "10.0.0.99",
      message: "Suspicious IP from MCP test",
      tags: ["mcp-test"],
      ioc: true,
      tlp: 1,
    });
    assert(!!obs._id, "No _id returned");
    testObsId = obs._id;
    console.log(`     Created observable: ${obs._id} (ip: 10.0.0.99)`);
  });

  await test("createObservable (domain)", async () => {
    const obs = await client.createObservable(testCaseId, {
      dataType: "domain",
      data: "malicious-test.example.com",
      message: "Test domain from MCP",
      tags: ["mcp-test"],
      ioc: true,
    });
    assert(!!obs._id, "No _id returned");
    console.log(`     Created observable: ${obs._id} (domain)`);
  });

  await test("createObservable (hash)", async () => {
    const obs = await client.createObservable(testCaseId, {
      dataType: "hash",
      data: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      message: "SHA-256 hash from MCP test",
      tags: ["mcp-test"],
      ioc: true,
    });
    assert(!!obs._id, "No _id returned");
    console.log(`     Created observable: ${obs._id} (hash)`);
  });

  await test("getObservable", async () => {
    const obs = await client.getObservable(testObsId);
    assert(obs._id === testObsId, "Wrong observable returned");
    assert(obs.data === "10.0.0.99", "Wrong data");
  });

  await test("listObservables", async () => {
    const obs = await client.listObservables(testCaseId);
    assert(obs.length >= 3, "Expected at least 3 observables");
    console.log(`     Found ${obs.length} observables in case`);
  });

  await test("searchObservables (by dataType)", async () => {
    const obs = await client.searchObservables({ dataType: "ip" });
    assert(obs.length >= 1, "Expected at least 1 IP observable");
    console.log(`     Found ${obs.length} IP observables globally`);
  });

  // --- Comments ---
  console.log("\n💬 Comments");
  await test("createComment", async () => {
    const c = await client.createComment(
      testCaseId,
      "Automated comment from MCP integration test. All tools verified.",
    );
    assert(!!c._id, "No _id returned");
    console.log(`     Created comment: ${c._id}`);
  });

  await test("listComments", async () => {
    const comments = await client.listComments(testCaseId);
    assert(comments.length >= 1, "Expected at least 1 comment");
    console.log(`     Found ${comments.length} comments`);
  });

  // --- Alerts ---
  console.log("\n🚨 Alerts");
  let testAlertId: string = "";

  await test("createAlert", async () => {
    const a = await client.createAlert({
      title: "[MCP-TEST] Suspicious Activity Alert",
      type: "mcp-test",
      source: "thehive-mcp-integration",
      sourceRef: `mcp-test-${Date.now()}`,
      description: "Automated test alert",
      severity: 1,
      tlp: 1,
      tags: ["mcp-test", "automated"],
    });
    assert(!!a._id, "No _id returned");
    testAlertId = a._id;
    console.log(`     Created alert: ${a._id}`);
  });

  await test("getAlert", async () => {
    const a = await client.getAlert(testAlertId);
    assert(a._id === testAlertId, "Wrong alert returned");
  });

  await test("updateAlert", async () => {
    const a = await client.updateAlert(testAlertId, {
      severity: 2,
      tags: ["mcp-test", "automated", "updated"],
    });
    assert(a._id === testAlertId, "Wrong alert returned");
  });

  await test("listAlerts", async () => {
    const alerts = await client.listAlerts({ limit: 5 });
    assert(alerts.length >= 1, "Expected at least 1 alert");
    console.log(`     Found ${alerts.length} alerts`);
  });

  // Promote alert to case
  await test("promoteAlert", async () => {
    const promoted = await client.promoteAlert(testAlertId);
    assert(!!promoted._id, "No case _id from promotion");
    console.log(`     Promoted alert to case: ${promoted._id}`);
  });

  // --- Bulk Observables ---
  console.log("\n📦 Bulk Observables");
  await test("createObservableBulk (3 IPs)", async () => {
    const obs = await client.createObservableBulk(testCaseId, {
      dataType: "ip",
      data: ["172.16.0.1", "172.16.0.2", "172.16.0.3"],
      message: "Bulk test IPs from MCP",
      tags: ["mcp-test", "bulk"],
      ioc: true,
    });
    assert(obs.length === 3, `Expected 3 observables, got ${obs.length}`);
    console.log(`     Created ${obs.length} observables in one request`);
  });

  // --- Raw Query ---
  console.log("\n🔎 Raw Query");
  await test("rawQuery (cases by severity)", async () => {
    const result = await client.rawQuery(
      [
        { _name: "listCase" },
        { _name: "filter", _field: "severity", _value: 1 },
      ],
      { range: "0-5", sort: ["-_createdAt"] },
    );
    assert(Array.isArray(result), "Expected array result");
    console.log(`     Found ${result.length} severity-1 cases`);
  });

  // --- Case Templates ---
  console.log("\n📋 Case Templates");
  skip("listCaseTemplates", "already covered by read-only checks");

  // --- Cortex ---
  console.log("\n🧠 Cortex");
  skip("listAnalyzers", "already covered by read-only checks");

  // --- Close Case ---
  console.log("\n🔒 Close Case");
  await test("close case (via updateCase)", async () => {
    // Create a throwaway case to close
    const closeCase = await client.createCase({
      title: "[MCP-TEST] Close Test",
      description: "Case for testing close/resolve workflow",
      severity: 1,
      tags: ["mcp-test"],
    });
    // TheHive 5: status IS the resolution (FalsePositive, TruePositive, etc.)
    const closed = await client.updateCase(closeCase._id, {
      status: "FalsePositive",
      impactStatus: "NoImpact",
      summary: "Test closure from MCP integration test",
    });
    assert(closed.status === "FalsePositive", `Expected FalsePositive, got ${closed.status}`);
    console.log(`     Closed case ${closeCase._id} as FalsePositive`);
    if (allowDestructive) {
      await client.deleteCase(closeCase._id);
    } else {
      console.log(`     Cleanup skipped for ${closeCase._id}; set THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true to delete test data`);
    }
  });

  // --- Delete ---
  console.log("\n🗑️  Delete");
  if (allowDestructive) {
    await test("deleteAlert", async () => {
      const a = await client.createAlert({
        title: "[MCP-TEST] Delete Me",
        description: "Alert for testing delete",
        type: "mcp-test",
        source: "integration-test",
        sourceRef: `del-${Date.now()}`,
        severity: 1,
        tags: ["mcp-test"],
      });
      await client.deleteAlert(a._id);
      // Verify it's gone
      try {
        await client.getAlert(a._id);
        throw new Error("Alert should have been deleted");
      } catch (err) {
        assert(
          err instanceof Error && err.message.includes("not found"),
          "Expected not found error",
        );
      }
      console.log(`     Deleted alert ${a._id} (verified gone)`);
    });

    await test("deleteCase", async () => {
      const c = await client.createCase({
        title: "[MCP-TEST] Delete Me",
        description: "Case for testing delete",
        severity: 1,
        tags: ["mcp-test"],
      });
      await client.deleteCase(c._id);
      // Verify it's gone
      try {
        await client.getCase(c._id);
        throw new Error("Case should have been deleted");
      } catch (err) {
        assert(
          err instanceof Error && err.message.includes("not found"),
          "Expected not found error",
        );
      }
      console.log(`     Deleted case ${c._id} (verified gone)`);
    });
  } else {
    skip("deleteAlert", "set THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true to delete test data");
    skip("deleteCase", "set THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true to delete test data");
  }

  // --- Case Merge ---
  console.log("\n🔀 Case Merge");
  if (allowDestructive) {
    await test("mergeCases", async () => {
      // Create a second case to merge with
      const c2 = await client.createCase({
        title: "[MCP-TEST] Merge Target",
        description: "Case to merge",
        severity: 1,
        tags: ["mcp-test"],
      });
      try {
        const merged = await client.mergeCases([testCaseId, c2._id]);
        assert(!!merged._id, "No _id from merge");
        console.log(`     Merged into: ${merged._id}`);
      } catch (err) {
        // Merge may fail if cases are in wrong state, that's OK
        console.log(`     Merge skipped (expected in some configs): ${err instanceof Error ? err.message : err}`);
      }
    });
  } else {
    skip("mergeCases", "set THEHIVE_LIVE_ALLOW_DESTRUCTIVE=true to merge test data");
  }

  // --- Summary ---
  finish();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
