import type { IncomingMessage, ServerResponse } from "node:http";
import { MatchMode } from "@prisma/client";
import { getSessionByToken, type AuthenticatedSession } from "../database";
import { ApiErrorBody, ApiException, ApiSuccessBody, JsonObject } from "./types";

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: ApiErrorBody | ApiSuccessBody
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  });
  res.end(JSON.stringify(payload));
}

export function sendSuccess(res: ServerResponse, statusCode: number, data: unknown): void {
  sendJson(res, statusCode, {
    ok: true,
    data,
  });
}

export function sendError(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  sendJson(res, statusCode, {
    ok: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

export async function readJsonBody(req: IncomingMessage): Promise<JsonObject> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk));
    }
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!isObject(parsed)) {
    throw new ApiException(400, "VALIDATION_ERROR", "JSON body must be an object.");
  }

  return parsed;
}

export function getTrimmedString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export function getAuthToken(req: IncomingMessage): string {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return "";
  }

  const parts = authorization.trim().split(" ");
  if (parts.length !== 2) {
    return "";
  }

  if (parts[0].toLowerCase() !== "bearer") {
    return "";
  }

  return parts[1].trim();
}

export function validateUsername(username: string): void {
  const valid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  if (!valid) {
    throw new ApiException(
      400,
      "VALIDATION_ERROR",
      "username must be 3-20 chars and contain only letters, numbers, or underscores."
    );
  }
}

export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new ApiException(400, "VALIDATION_ERROR", "password must be at least 8 characters.");
  }
}

export function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.floor(parsed);
  return Math.max(min, Math.min(max, rounded));
}

export function modeToEnum(mode: "ranked" | "ffa"): MatchMode {
  if (mode === "ranked") {
    return MatchMode.RANKED;
  }
  return MatchMode.FFA;
}

export function modeFromQuery(modeRaw: string | null): MatchMode | undefined {
  if (!modeRaw) {
    return undefined;
  }
  const normalized = modeRaw.trim().toLowerCase();
  if (normalized === "ranked") {
    return MatchMode.RANKED;
  }
  if (normalized === "ffa") {
    return MatchMode.FFA;
  }
  if (normalized === "private") {
    return MatchMode.PRIVATE;
  }
  return undefined;
}

export async function requireAuth(
  req: IncomingMessage
): Promise<{ token: string; session: AuthenticatedSession }> {
  const token = getAuthToken(req);
  if (!token) {
    throw new ApiException(401, "UNAUTHORIZED", "Missing bearer token.");
  }

  const session = await getSessionByToken(token);
  if (!session) {
    throw new ApiException(401, "UNAUTHORIZED", "Session is invalid or expired.");
  }

  if (session.user.isBanned) {
    throw new ApiException(403, "FORBIDDEN", "This account is banned.");
  }

  return { token, session };
}

export function mapKnownError(error: unknown): ApiException {
  if (error instanceof ApiException) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message === "USERNAME_ALREADY_EXISTS") {
      return new ApiException(409, "CONFLICT", "username is already taken.");
    }
    if (error.message === "INVALID_OLD_PASSWORD") {
      return new ApiException(400, "VALIDATION_ERROR", "current password is incorrect.");
    }
    if (error.message === "USER_NOT_FOUND") {
      return new ApiException(404, "NOT_FOUND", "user not found.");
    }
    if (error.message === "ALREADY_FRIENDS") {
      return new ApiException(409, "CONFLICT", "users are already friends.");
    }
    if (error.message === "REQUEST_ALREADY_PENDING") {
      return new ApiException(409, "CONFLICT", "friend request is already pending.");
    }
    if (error.message === "FRIEND_REQUEST_NOT_FOUND") {
      return new ApiException(404, "NOT_FOUND", "friend request not found.");
    }
    if (error.message === "NOT_FRIENDS") {
      return new ApiException(404, "NOT_FOUND", "users are not friends.");
    }
    if (error.message === "FORBIDDEN") {
      return new ApiException(403, "FORBIDDEN", "operation forbidden.");
    }
    if (error.message === "CANNOT_SEND_MESSAGE_BLOCKED") {
      return new ApiException(403, "FORBIDDEN", "messaging is blocked between these users.");
    }
    if (error.message === "CANNOT_CHALLENGE_BLOCKED") {
      return new ApiException(403, "FORBIDDEN", "challenge is blocked between these users.");
    }
    if (error.message === "CANNOT_BLOCK_SELF") {
      return new ApiException(400, "VALIDATION_ERROR", "you cannot block yourself.");
    }
    if (error.message === "CANNOT_FRIEND_SELF") {
      return new ApiException(400, "VALIDATION_ERROR", "you cannot friend yourself.");
    }
    if (error.message === "CANNOT_MESSAGE_SELF") {
      return new ApiException(400, "VALIDATION_ERROR", "you cannot message yourself.");
    }
    if (error.message === "CANNOT_CHALLENGE_SELF") {
      return new ApiException(400, "VALIDATION_ERROR", "you cannot challenge yourself.");
    }
    if (error.message === "CANNOT_REPORT_SELF") {
      return new ApiException(400, "VALIDATION_ERROR", "you cannot report yourself.");
    }
    if (error.message === "MATCH_NOT_FOUND") {
      return new ApiException(404, "NOT_FOUND", "private match not found.");
    }
    if (error.message === "INVALID_PASSWORD") {
      return new ApiException(403, "FORBIDDEN", "incorrect room password.");
    }
    if (error.message === "CANNOT_JOIN_OWN_LOBBY") {
      return new ApiException(400, "VALIDATION_ERROR", "you cannot join your own lobby.");
    }
    if (error.message === "INVALID_SCORE") {
      return new ApiException(400, "VALIDATION_ERROR", "score must be between 0 and 100.");
    }

    return new ApiException(500, "INTERNAL_ERROR", "Unexpected server error.", {
      message: error.message,
    });
  }

  return new ApiException(500, "INTERNAL_ERROR", "Unexpected server error.");
}
