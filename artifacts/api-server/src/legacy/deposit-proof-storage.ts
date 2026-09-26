import { randomUUID } from "node:crypto";

const sidecarEndpoint = "http://127.0.0.1:1106";

function bucketName() {
  const bucket = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucket) throw new Error("OBJECT_STORAGE_BUCKET_NOT_CONFIGURED");
  return bucket;
}

async function signObjectUrl(
  objectName: string,
  method: "PUT" | "GET" | "HEAD",
  ttlSeconds: number,
) {
  const bucket = bucketName();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${sidecarEndpoint}/object-storage/signed-object-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket_name: bucket,
          object_name: objectName,
          method,
          expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        }),
        signal: AbortSignal.timeout(6_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as { signed_url?: string };
        if (!payload.signed_url) throw new Error("OBJECT_STORAGE_SIGNING_FAILED");
        return payload.signed_url;
      }
      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (!retryable || attempt === 2) {
        throw new Error(`OBJECT_STORAGE_SIGNING_FAILED_${response.status}`);
      }
    } catch (error) {
      if (
        attempt === 2 ||
        (error instanceof Error && error.message.startsWith("OBJECT_STORAGE_SIGNING_FAILED"))
      ) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new Error("OBJECT_STORAGE_SIGNING_FAILED");
}

export async function createDepositProofUpload(userId: string) {
  const objectKey = `deposit-proofs/${userId}/${randomUUID()}`;
  const uploadUrl = await signObjectUrl(objectKey, "PUT", 900);
  return { objectKey, uploadUrl };
}

export async function createDepositProofReadUrl(objectKey: string) {
  if (!objectKey.startsWith("deposit-proofs/")) throw new Error("INVALID_DEPOSIT_PROOF_KEY");
  return signObjectUrl(objectKey, "GET", 300);
}

export async function verifyDepositProofObject(
  objectKey: string,
  expectedContentType: string,
  expectedSize: number,
) {
  if (!objectKey.startsWith("deposit-proofs/")) return false;
  const headUrl = await signObjectUrl(objectKey, "HEAD", 300);
  const head = await fetch(headUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (
    !head.ok ||
    head.headers.get("content-type")?.split(";")[0] !== expectedContentType ||
    Number(head.headers.get("content-length")) !== expectedSize ||
    expectedSize > 5 * 1024 * 1024
  )
    return false;

  const readUrl = await signObjectUrl(objectKey, "GET", 300);
  const image = await fetch(readUrl, {
    headers: { Range: "bytes=0-11" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!image.ok || !image.body) return false;
  const reader = image.body.getReader();
  const prefix: number[] = [];
  try {
    while (prefix.length < 12) {
      const chunk = await reader.read();
      if (chunk.done) break;
      prefix.push(...chunk.value.slice(0, 12 - prefix.length));
    }
  } finally {
    await reader.cancel();
  }
  const isPng =
    expectedContentType === "image/png" &&
    prefix.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  const isJpeg =
    expectedContentType === "image/jpeg" && prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255;
  const isWebp =
    expectedContentType === "image/webp" &&
    prefix.slice(0, 4).join(",") === "82,73,70,70" &&
    prefix.slice(8, 12).join(",") === "87,69,66,80";
  return isPng || isJpeg || isWebp;
}