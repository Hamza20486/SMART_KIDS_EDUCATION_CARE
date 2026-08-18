import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

function configuration() {
  const accountId = process.env.BACKUP_R2_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
  const accessKeyId =
    process.env.BACKUP_R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.BACKUP_R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BACKUP_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2 backup storage is not configured");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function backupClient() {
  const config = configuration();
  return {
    bucket: config.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

export async function uploadBackup(input: {
  key: string;
  filePath: string;
  sha256: string;
}) {
  const { client, bucket } = backupClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: createReadStream(input.filePath),
      ContentType: "application/vnd.postgresql.custom-dump",
      CacheControl: "private, no-store",
      ServerSideEncryption: "AES256",
      Metadata: {
        sha256: input.sha256,
        format: "pg-custom-v1",
      },
    }),
  );
  return { bucket, key: input.key };
}

export async function downloadBackup(key: string, destination: string) {
  const { client, bucket } = backupClient();
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!response.Body) throw new Error("Backup object has no body");
  const source = Readable.fromWeb(response.Body.transformToWebStream() as never);
  await pipeline(source, createWriteStream(destination, { flags: "wx" }));
  return {
    bucket,
    key,
    expectedSha256: response.Metadata?.sha256 ?? null,
  };
}

export async function latestBackupKey() {
  const { client, bucket } = backupClient();
  const environment = process.env.SENTRY_ENVIRONMENT ?? "production";
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: `postgres/${environment}/`,
    }),
  );
  const latest = (response.Contents ?? [])
    .filter((item) => item.Key && item.LastModified)
    .sort(
      (left, right) =>
        right.LastModified!.getTime() - left.LastModified!.getTime(),
    )[0];
  if (!latest?.Key) throw new Error("No PostgreSQL backup is available");
  return latest.Key;
}

export async function pruneExpiredBackups(now = new Date()) {
  const { client, bucket } = backupClient();
  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "90");
  if (!Number.isInteger(retentionDays) || retentionDays < 7) {
    throw new Error("BACKUP_RETENTION_DAYS must be an integer of at least 7");
  }
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const expired: Array<{ Key: string }> = [];
  let continuationToken: string | undefined;
  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "postgres/",
        ContinuationToken: continuationToken,
      }),
    );
    expired.push(
      ...(listed.Contents ?? [])
        .filter((item) => item.Key && item.LastModified && item.LastModified < cutoff)
        .map((item) => ({ Key: item.Key! })),
    );
    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
  for (let index = 0; index < expired.length; index += 1_000) {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: expired.slice(index, index + 1_000), Quiet: true },
      }),
    );
  }
  return expired.length;
}
