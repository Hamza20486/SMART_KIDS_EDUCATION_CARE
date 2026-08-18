export {};

const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.APP_URL;
if (!baseUrl) throw new Error("SMOKE_BASE_URL or APP_URL is required");

async function check(
  path: string,
  expected: number,
  headers: Record<string, string> = {},
) {
  const startedAt = Date.now();
  const response = await fetch(new URL(path, baseUrl), {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== expected) {
    throw new Error(`${path} returned ${response.status}; expected ${expected}`);
  }
  return { path, status: response.status, latencyMs: Date.now() - startedAt };
}

const healthToken = process.env.HEALTHCHECK_TOKEN;
if (!healthToken) throw new Error("HEALTHCHECK_TOKEN is required for smoke tests");
const results = [];
results.push(await check("/api/health/live", 200));
results.push(
  await check("/api/health/ready", 200, {
    authorization: `Bearer ${healthToken}`,
  }),
);
results.push(await check("/fr", 200));
results.push(await check("/fr/login", 200));
console.log(JSON.stringify({ event: "http.smoke.passed", results }));
