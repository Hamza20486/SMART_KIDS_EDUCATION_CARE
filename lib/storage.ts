import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export function privateStorageConfigured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

function client() {
  if (!privateStorageConfigured()) throw new Error("R2 is not configured");
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function safeStorageKey(key: string) {
  if (
    !key ||
    key.includes("\0") ||
    path.isAbsolute(key) ||
    key.split(/[\\/]/).includes("..")
  ) {
    throw new Error("Invalid private storage key");
  }
  return key.replaceAll("\\", "/");
}

function localPath(key: string) {
  return path.join(process.cwd(), ".private-storage", safeStorageKey(key));
}

export async function putPrivateObject(
  key: string,
  body: Buffer,
  contentType: string,
) {
  const safeKey = safeStorageKey(key);
  if (privateStorageConfigured()) {
    return client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: safeKey,
        Body: body,
        ContentType: contentType,
        CacheControl: "private, max-age=0, no-store",
      }),
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Private object storage is required");
  }
  const target = localPath(safeKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body, { flag: "wx" });
}

export async function getPrivateObject(key: string) {
  const safeKey = safeStorageKey(key);
  if (privateStorageConfigured()) {
    const result = await client().send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: safeKey }),
    );
    return Buffer.from(await result.Body!.transformToByteArray());
  }
  return readFile(localPath(safeKey));
}

export async function deletePrivateObject(key: string) {
  const safeKey = safeStorageKey(key);
  if (privateStorageConfigured()) {
    return client().send(
      new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: safeKey }),
    );
  }
  await unlink(localPath(safeKey)).catch(() => undefined);
}

export async function privateDownloadUrl(key: string, expiresIn = 60) {
  const safeKey = safeStorageKey(key);
  if (!privateStorageConfigured()) return null;
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: safeKey }),
    { expiresIn },
  );
}

export async function checkPrivateStorage() {
  if (!privateStorageConfigured()) {
    return { ok: false, detail: "not_configured" } as const;
  }
  await client().send(new HeadBucketCommand({ Bucket: process.env.R2_BUCKET! }));
  return { ok: true, detail: "reachable" } as const;
}
