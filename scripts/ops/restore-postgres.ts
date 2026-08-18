import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  downloadBackup,
  latestBackupKey,
} from "../../lib/ops/backup-storage";
import { assertSafeRestoreTarget } from "../../lib/ops/restore-safety";

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

const target = process.env.RESTORE_DATABASE_URL;
const backupInput = process.env.BACKUP_OBJECT_KEY;
if (!target) throw new Error("RESTORE_DATABASE_URL is required");
if (!backupInput) throw new Error("BACKUP_OBJECT_KEY is required");
assertSafeRestoreTarget({
  target,
  currentDatabase:
    process.env.PRISMA_MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
  allowProductionRestore: process.env.ALLOW_PRODUCTION_RESTORE === "true",
});
const backupKey =
  backupInput === "latest" ? await latestBackupKey() : backupInput;

const temporary = await mkdtemp(path.join(os.tmpdir(), "smart-kids-restore-"));
const dumpPath = path.join(temporary, "database.dump");
try {
  const downloaded = await downloadBackup(backupKey, dumpPath);
  const actualSha256 = await sha256(dumpPath);
  if (
    downloaded.expectedSha256 &&
    downloaded.expectedSha256 !== actualSha256
  ) {
    throw new Error("Backup checksum verification failed");
  }
  await run(
    process.env.PG_RESTORE_BIN ?? "pg_restore",
    [
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      dumpPath,
    ],
    { ...process.env, PGDATABASE: target },
  );
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const restoreEnvironment = {
    ...process.env,
    DATABASE_URL: target,
    PRISMA_MIGRATION_DATABASE_URL: target,
  };
  await run(npm, ["run", "db:deploy"], restoreEnvironment);
  await run(npm, ["run", "ops:smoke:database"], restoreEnvironment);
  console.log(
    JSON.stringify({
      event: "restore.completed",
      backupKey,
      sha256: actualSha256,
      smokeTests: "passed",
    }),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
