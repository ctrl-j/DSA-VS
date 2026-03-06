import * as fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as path from "node:path";
import type { URL } from "node:url";
import { ApiException } from "../types";

const TEST_CLIENT_FILE = path.resolve(__dirname, "../../public/test-client.html");

export async function handleTestClientRoute(
  req: IncomingMessage,
  url: URL,
  res: ServerResponse
): Promise<boolean> {
  if (req.method !== "GET" || (url.pathname !== "/" && url.pathname !== "/test-client")) {
    return false;
  }

  try {
    const html = await fs.readFile(TEST_CLIENT_FILE, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return true;
  } catch (_error) {
    throw new ApiException(500, "INTERNAL_ERROR", "Failed to load test client page.");
  }
}
