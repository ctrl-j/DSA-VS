import * as fs from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as path from "node:path";
import type { URL } from "node:url";
import { ApiException } from "../types";

function candidateTestClientPaths(): string[] {
  return [
    path.resolve(process.cwd(), "public/test-client.html"),
    path.resolve(__dirname, "../../../public/test-client.html"),
    path.resolve(__dirname, "../../public/test-client.html"),
  ];
}

async function readTestClientHtml(): Promise<string> {
  for (const filePath of candidateTestClientPaths()) {
    try {
      return await fs.readFile(filePath, "utf8");
    } catch {
      // Try next candidate path.
    }
  }

  throw new ApiException(500, "INTERNAL_ERROR", "Failed to load test client page.");
}

export async function handleTestClientRoute(
  req: IncomingMessage,
  url: URL,
  res: ServerResponse
): Promise<boolean> {
  if (req.method !== "GET" || (url.pathname !== "/" && url.pathname !== "/test-client")) {
    return false;
  }

  const html = await readTestClientHtml();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
  return true;
}
