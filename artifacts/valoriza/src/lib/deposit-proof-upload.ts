import { backendRequest } from "@/lib/backend-client";

const SIGNING_TIMEOUT_MS = 45_000;
const UPLOAD_TIMEOUT_MS = 60_000;
const SIGNING_RETRY_DELAY_MS = 500;
const TRANSIENT_SIGNING_STATUSES = new Set([429, 500, 502, 503, 504]);

export type DepositProofErrorStage = "signing" | "details" | "upload";

export class DepositProofUploadError extends Error {
  readonly stage: DepositProofErrorStage;
  readonly status?: number;

  constructor(stage: DepositProofErrorStage, message: string, status?: number) {
    super(message);
    this.name = "DepositProofUploadError";
    this.stage = stage;
    this.status = status;
  }
}

export interface DepositProofUploadDetails {
  proofId: string;
  uploadURL: string;
  objectPath: string;
}

function getHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/API request failed: (\d{3})/);
  return match ? Number(match[1]) : undefined;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function shouldRetrySigning(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status !== undefined
    ? TRANSIENT_SIGNING_STATUSES.has(status)
    : isTimeout(error);
}

export async function requestDepositProofUpload(
  file: File,
): Promise<DepositProofUploadDetails> {
  let response: {
    proofId?: string;
    uploadURL?: string;
    uploadUrl?: string;
    signedUrl?: string;
    objectPath?: string;
  } | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await backendRequest("/api/app/deposit-proof/upload-url", {
        method: "POST",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      }, SIGNING_TIMEOUT_MS);
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 1 || !shouldRetrySigning(error)) {
        const status = getHttpStatus(error);
        throw new DepositProofUploadError("signing", error instanceof Error ? error.message : "Upload signing failed", status);
      }
      await new Promise((resolve) => setTimeout(resolve, SIGNING_RETRY_DELAY_MS));
    }
  }

  if (!response) {
    const status = getHttpStatus(lastError);
    throw new DepositProofUploadError(
      "signing",
      lastError instanceof Error ? lastError.message : "Upload signing failed",
      status,
    );
  }

  const uploadURL = response.uploadURL ?? response.uploadUrl ?? response.signedUrl;
  if (
    typeof response.proofId !== "string" ||
    !response.proofId ||
    typeof uploadURL !== "string" ||
    !uploadURL ||
    typeof response.objectPath !== "string" ||
    !response.objectPath
  ) {
    throw new DepositProofUploadError("details", "Deposit proof upload details are incomplete");
  }

  return { proofId: response.proofId, uploadURL, objectPath: response.objectPath };
}

export async function uploadDepositProofFile(uploadURL: string, file: File): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
      signal: controller.signal,
    });
  } catch (error) {
    throw new DepositProofUploadError(
      "upload",
      error instanceof Error ? error.message : "Deposit proof upload failed",
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new DepositProofUploadError(
      "upload",
      `Deposit proof upload failed: ${response.status}`,
      response.status,
    );
  }
}