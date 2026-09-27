import { createHash } from "node:crypto";
import { Storage } from "@google-cloud/storage";

// The storage SDK uses Replit's sidecar for credentials, but uploads and reads
// go directly to object storage. No signed URL service or browser-to-GCS PUT is
// required for deposit receipts.
const sidecarEndpoint = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${sidecarEndpoint}/token`,
    type: "external_account",
    credential_source: {
      url: `${sidecarEndpoint}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const proofKeyPattern =
  /^deposit-proofs\/[0-9a-f-]{36}\/(?:[0-9a-f-]{36}|[0-9a-f]{64})$/i;

function proofFile(objectKey: string) {
  if (!proofKeyPattern.test(objectKey)) throw new Error("INVALID_DEPOSIT_PROOF_KEY");
  const bucket = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucket) throw new Error("OBJECT_STORAGE_BUCKET_NOT_CONFIGURED");
  return storage.bucket(bucket).file(objectKey);
}

export function createDepositProofKey(userId: string, bytes: Buffer) {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const objectKey = `deposit-proofs/${userId}/${sha256}`;
  if (!proofKeyPattern.test(objectKey)) throw new Error("INVALID_DEPOSIT_PROOF_KEY");
  return { objectKey, sha256 };
}

export function hasValidDepositProofSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/png")
    return bytes.length >= 8 &&
      bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (contentType === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (contentType === "image/webp")
    return bytes.length >= 12 &&
      bytes.slice(0, 4).join(",") === "82,73,70,70" &&
      bytes.slice(8, 12).join(",") === "87,69,66,80";
  return false;
}

function storageFailure(operation: string, error: unknown) {
  return new Error(`OBJECT_STORAGE_${operation}_FAILED`, { cause: error });
}

export async function readDepositProofMetadata(objectKey: string) {
  try {
    const [metadata] = await proofFile(objectKey).getMetadata();
    return {
      contentType: metadata.contentType?.split(";")[0],
      size: Number(metadata.size),
      sha256: metadata.metadata?.sha256,
    };
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw storageFailure("READ", error);
  }
}

export async function storeDepositProofObject(
  objectKey: string,
  bytes: Buffer,
  contentType: string,
  sha256: string,
) {
  const file = proofFile(objectKey);
  try {
    // Never overwrite a receipt, including when two attempts use the same ID.
    await file.save(bytes, {
      resumable: false,
      metadata: { contentType, metadata: { sha256 } },
      preconditionOpts: { ifGenerationMatch: 0 },
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 412)
      throw storageFailure("WRITE", error);
    // A retry may find a stored object whose DB insert had not completed.
    const metadata = await readDepositProofMetadata(objectKey);
    if (metadata?.contentType !== contentType ||
        metadata.size !== bytes.length || metadata.sha256 !== sha256)
      throw new Error("DEPOSIT_PROOF_UPLOAD_CONFLICT");
  }
}

export async function verifyDepositProofObject(
  objectKey: string,
  expectedContentType: string,
  expectedSize: number,
) {
  const metadata = await readDepositProofMetadata(objectKey);
  if (!metadata || metadata.contentType !== expectedContentType ||
      metadata.size !== expectedSize || expectedSize > 5 * 1024 * 1024)
    return false;

  try {
    const [prefix] = await proofFile(objectKey).download({ start: 0, end: 11 });
    return hasValidDepositProofSignature(prefix, expectedContentType);
  } catch (error) {
    if ((error as { code?: number }).code === 404) return false;
    throw storageFailure("READ", error);
  }
}

export function createDepositProofReadStream(objectKey: string) {
  return proofFile(objectKey).createReadStream();
}