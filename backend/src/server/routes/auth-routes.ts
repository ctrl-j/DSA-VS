import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  createSessionForUser,
  deleteSessionByToken,
  loginUser,
  registerUser,
} from "../../database";
import {
  getAuthToken,
  getTrimmedString,
  readJsonBody,
  sendSuccess,
  validatePassword,
  validateUsername,
} from "../http-utils";
import { ApiException } from "../types";

export async function handleAuthRoutes(
  req: IncomingMessage,
  url: URL,
  res: ServerResponse
): Promise<boolean> {
  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readJsonBody(req);
    const username = getTrimmedString(body.username);
    const password = typeof body.password === "string" ? body.password : "";

    validateUsername(username);
    validatePassword(password);

    const user = await registerUser(username, password);
    sendSuccess(res, 201, {
      userId: user.id,
      username: user.username,
      elo: user.elo,
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJsonBody(req);
    const username = getTrimmedString(body.username);
    const password = typeof body.password === "string" ? body.password : "";

    validateUsername(username);
    validatePassword(password);

    const user = await loginUser(username, password);
    if (!user) {
      throw new ApiException(401, "UNAUTHORIZED", "Invalid username or password.");
    }

    const session = await createSessionForUser(user.id);
    sendSuccess(res, 200, {
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        elo: user.elo,
      },
      expiresAt: session.expiresAt,
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = getAuthToken(req);
    if (!token) {
      throw new ApiException(401, "UNAUTHORIZED", "Missing bearer token.");
    }

    await deleteSessionByToken(token);
    sendSuccess(res, 200, { loggedOut: true });
    return true;
  }

  return false;
}
