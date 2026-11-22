import express from "express";
import type { RequestHandler } from "express";

/**
 * Vercel can supply parsed JSON, while serverless-http supplies a raw Buffer
 * AND a readable stream. Only an actual parsed object may bypass express.json.
 */
export function createJsonBodyParser(): RequestHandler {
  const parser = express.json({ limit: "8mb" });
  return (request, response, next) => {
    if (
      request.body !== null &&
      typeof request.body === "object" &&
      !Buffer.isBuffer(request.body) &&
      !ArrayBuffer.isView(request.body)
    ) {
      next();
      return;
    }
    parser(request, response, next);
  };
}
