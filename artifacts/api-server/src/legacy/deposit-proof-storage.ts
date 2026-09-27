import { createHash } from "node:crypto";
import { Storage } from "@google-cloud/storage";

// Legacy receipts uploaded in Replit can still be viewed there. New receipts
// are stored in PostgreSQL, so Render never requires Replit's sidecar.
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

export function verifyDepositProofBytes(
  objectKey: string,
  bytes: Buffer | null,
  expectedContentType: string,
  expectedSize: number,
) {
  if (!bytes || bytes.length !== expectedSize ||
      expectedSize > 5 * 1024 * 1024 ||
      !hasValidDepositProofSignature(bytes, expectedContentType))
    return false;
  const digest = objectKey.split("/")[2];
  return !/^[0-9a-f]{64}$/i.test(digest) ||
    createHash("sha256").update(bytes).digest("hex") === digest.toLowerCase();
}

export function createDepositProofReadStream(objectKey: string) {
  return proofFile(objectKey).createReadStream();
}