import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  pruneExpiredBackups,
  uploadBackup,
} from "../../lib/ops/backup-storage";

function run(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: environment,
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with code ${code}`)),
    );
  });
}

async function sha256(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

const databaseUrl =
  process.env.PRISMA_MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("A direct PostgreSQL backup URL is required");

const temporary = await mkdtemp(path.join(os.tmpdir(), "smart-kids-backup-"));
const dumpPath = path.join(temporary, "database.dump");
try {
  await run(
    process.env.PG_DUMP_BIN ?? "pg_dump",
    [
      "--format=custom",
      "--compress=9",
      "--no-owner",
      "--no-privileges",
      `--file=${dumpPath}`,
    ],
    { ...process.env, PGDATABASE: databaseUrl },
  );
  const checksum = await sha256(dumpPath);
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const key = `postgres/${process.env.SENTRY_ENVIRONMENT ?? "production"}/${timestamp}.dump`;
  const uploaded = await uploadBackup({ key, filePath: dumpPath, sha256: checksum });
  const pruned = await pruneExpiredBackups();
  console.log(
    JSON.stringify({
      event: "backup.completed",
      bucket: uploaded.bucket,
      key: uploaded.key,
      sha256: checksum,
      pruned,
    }),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
