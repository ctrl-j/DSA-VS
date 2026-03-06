import type { WebSocket } from "ws";

export interface JsonObject {
  [key: string]: unknown;
}

export interface ApiErrorBody {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody {
  ok: true;
  data: unknown;
}

export interface WsEvent {
  event: string;
  payload?: unknown;
}

export interface WsAuthContext {
  userId: string;
  username: string;
}

export interface LiveWebSocket extends WebSocket {
  isAlive?: boolean;
}

export interface ActiveMatchTimer {
  interval: NodeJS.Timeout;
  endsAtMs: number;
  participantIds: [string, string];
}

export class ApiException extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
