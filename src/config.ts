export interface TheHiveConfig {
  url: string;
  apiKey: string;
  verifySsl: boolean;
  timeout: number;
}

export function getConfig(): TheHiveConfig {
  const url = process.env.THEHIVE_URL;
  if (!url) {
    throw new Error("THEHIVE_URL environment variable is required");
  }

  const apiKey = process.env.THEHIVE_API_KEY;
  if (!apiKey) {
    throw new Error("THEHIVE_API_KEY environment variable is required");
  }

  const verifySsl = process.env.THEHIVE_VERIFY_SSL !== "false";
  const timeout = parseInt(process.env.THEHIVE_TIMEOUT ?? "30", 10) * 1000;

  return {
    url: url.replace(/\/+$/, ""),
    apiKey,
    verifySsl,
    timeout,
  };
}
