import { ApiEnvelope, ApiError } from "../../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function withQuery(path: string, query?: RequestOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${withQuery(path, options.query)}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      // Bypass ngrok free-tier browser warning page for XHR/fetch requests.
      "ngrok-skip-browser-warning": "true",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    const message = payload.ok ? "Request failed" : payload.error.message;
    const code = payload.ok ? "HTTP_ERROR" : payload.error.code;
    throw new ApiError(message, code, response.status);
  }

  return payload.data;
}
