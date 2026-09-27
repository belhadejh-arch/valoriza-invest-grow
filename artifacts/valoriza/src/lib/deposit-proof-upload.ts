import { backendRequest } from "@/lib/backend-client";

const UPLOAD_TIMEOUT_MS = 90_000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TRANSIENT_UPLOAD_STATUSES = new Set([502, 503, 504]);

export type DepositProofErrorStage = "validation" | "details" | "upload";

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
  objectPath: string;
}

function getHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/API request failed: (\d{3})/);
  return match ? Number(match[1]) : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function shouldRetryUpload(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status !== undefined
    ? TRANSIENT_UPLOAD_STATUSES.has(status)
    : isAbortError(error);
}

export async function requestDepositProofUpload(
  file: File,
): Promise<DepositProofUploadDetails> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new DepositProofUploadError("validation", "invalidImage");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DepositProofUploadError("validation", "fileTooLarge");
  }

  let response: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await backendRequest<unknown>("/api/app/deposit-proof", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      }, UPLOAD_TIMEOUT_MS);
      break;
    } catch (error) {
      if (attempt === 1 || !shouldRetryUpload(error)) {
        const status = getHttpStatus(error);
        throw new DepositProofUploadError(
          "upload",
          error instanceof Error ? error.message : "Deposit proof upload failed",
          status,
        );
      }
    }
  }

  if (
    !response ||
    typeof response !== "object" ||
    !("ok" in response) ||
    response.ok !== true ||
    !("proofId" in response) ||
    typeof response.proofId !== "string" ||
    !response.proofId.trim() ||
    !("objectPath" in response) ||
    typeof response.objectPath !== "string" ||
    !response.objectPath.trim()
  ) {
    throw new DepositProofUploadError("details", "Deposit proof upload response is malformed");
  }

  return { proofId: response.proofId, objectPath: response.objectPath };
}