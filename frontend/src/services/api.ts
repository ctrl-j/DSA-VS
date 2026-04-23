const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    token?: string;
    query?: Record<string, string | number | undefined>;
  },
): Promise<T> {
  const url = new URL(path, BASE_URL);

  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json();

  if (!json.ok) {
    throw new ApiError(
      json.error?.code ?? "UNKNOWN",
      json.error?.message ?? "An error occurred",
      res.status,
    );
  }

  return json.data as T;
}
