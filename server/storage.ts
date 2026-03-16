/**
 * FL-GreenGuard: Storage Service
 *
 * Handles file uploads for certificates and job photos.
 * Uses AWS S3 directly when credentials are available,
 * falls back to the Manus storage proxy otherwise.
 */

import { ENV } from "./_core/env";

// ─── AWS S3 ───────────────────────────────────────────────────────────────────

const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "fl-greenguard-certificates";
const S3_REGION = process.env.AWS_REGION ?? "us-east-1";
const AWS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "";
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY ?? "";

function hasAwsCredentials(): boolean {
  return !!(AWS_KEY_ID && AWS_SECRET && !AWS_KEY_ID.startsWith("PASTE"));
}

/**
 * Generate a pre-signed S3 URL for a direct client upload.
 * Returns null if AWS credentials are not configured.
 */
export async function getS3UploadUrl(
  key: string,
  contentType: string
): Promise<string | null> {
  if (!hasAwsCredentials()) return null;

  // Dynamically import the AWS SDK (server only — not bundled into the app)
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: AWS_KEY_ID,
        secretAccessKey: AWS_SECRET,
      },
    });

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(client, command, { expiresIn: 3600 });
  } catch (err) {
    console.error("[Storage] AWS S3 error:", err);
    return null;
  }
}

/**
 * Generate a public S3 URL for a stored file.
 */
export function getS3PublicUrl(key: string): string {
  return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
}

// ─── Manus proxy fallback ────────────────────────────────────────────────────

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const dlUrl = new URL("v1/storage/downloadUrl", ensureTrailingSlash(baseUrl));
  dlUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(dlUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
