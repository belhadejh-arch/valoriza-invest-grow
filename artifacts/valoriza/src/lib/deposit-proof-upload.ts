import { backendRequest, getStoredToken } from "@/lib/backend-client";

const UPLOAD_TIMEOUT_MS = 90_000;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TRANSIENT_UPLOAD_STATUSES = new Set([502, 503, 504]);
// Keep this trusted origin in sync with the /api rewrite in vercel.json.
// Vercel's proxy can drop large/slow browser uploads before Render sees them.
const RENDER_API_ORIGIN = "https://valoriza-invest-grow.onrender.com";

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
    : isAbortError(error) || error instanceof TypeError;
}

async function uploadDirectlyToRender(file: File, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(`${RENDER_API_ORIGIN}/api/app/deposit-proof`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
      },
      body: file,
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
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

  // The browser login stores a bearer token. Use it only for the same Render
  // service that Vercel already proxies, and never send cookies cross-origin.
  const directToken = typeof window !== "undefined" &&
    window.location.hostname === "valoriza-ten.vercel.app"
    ? getStoredToken()
    : null;
  const transports = directToken
    ? (["direct", "proxy", "proxy"] as const)
    : (["proxy", "proxy"] as const);
  let response: unknown;
  for (let attempt = 0; attempt < transports.length; attempt += 1) {
    const transport = transports[attempt];
    try {
      response = transport === "direct" && directToken
        ? await uploadDirectlyToRender(file, directToken)
        : await backendRequest<unknown>("/api/app/deposit-proof", {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          }, UPLOAD_TIMEOUT_MS);
      break;
    } catch (error) {
      // A stale bearer token can fail direct auth even when the browser still
      // has a valid same-origin session cookie.
      const canFallBackToCookie = transport === "direct" && getHttpStatus(error) === 401;
      if (attempt === transports.length - 1 || (!shouldRetryUpload(error) && !canFallBackToCookie)) {
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