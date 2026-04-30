import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  createPrivateMatch,
  getPrivateMatchLobbies,
  validatePrivateMatchJoin,
} from "../../db/private-match-repo";
import { getUserElo, type SafeUser } from "../../database";
import { getTrimmedString, readJsonBody, sendSuccess } from "../http-utils";
import { ApiException } from "../types";

export async function handlePrivateMatchRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: IncomingMessage
): Promise<boolean> {
  // Create a private match lobby
  if (method === "POST" && url.pathname === "/api/matches/private") {
    const body = await readJsonBody(req);
    const roomName = getTrimmedString(body.roomName);
    const password = typeof body.password === "string" ? body.password : "";

    if (!roomName) {
      throw new ApiException(400, "VALIDATION_ERROR", "roomName is required.");
    }
    if (roomName.length > 50) {
      throw new ApiException(400, "VALIDATION_ERROR", "roomName must be 50 characters or less.");
    }
    if (!password) {
      throw new ApiException(400, "VALIDATION_ERROR", "password is required.");
    }

    const elo = (await getUserElo(currentUser.id)) ?? 1000;
    const match = await createPrivateMatch(currentUser.id, elo, roomName, password);

    sendSuccess(res, 201, match);
    return true;
  }

  // Validate a private match join (password check only — match starts via WS)
  if (method === "POST" && url.pathname === "/api/matches/private/join") {
    const body = await readJsonBody(req);
    const roomName = getTrimmedString(body.roomName);
    const password = typeof body.password === "string" ? body.password : "";

    if (!roomName) {
      throw new ApiException(400, "VALIDATION_ERROR", "roomName is required.");
    }
    if (!password) {
      throw new ApiException(400, "VALIDATION_ERROR", "password is required.");
    }

    const result = await validatePrivateMatchJoin(currentUser.id, roomName, password);

    sendSuccess(res, 200, result);
    return true;
  }

  // List private match lobbies
  if (method === "GET" && url.pathname === "/api/matches/private/lobbies") {
    const lobbies = await getPrivateMatchLobbies();
    sendSuccess(res, 200, lobbies);
    return true;
  }

  return false;
}
