import type { ServerResponse } from "node:http";
import type { URL } from "node:url";
import {
  changeUserPassword,
  getUserAchievements,
  getUserByUsername,
  getUserElo,
  getUserInfo,
  updateProfile,
  type SafeUser,
} from "../../database";
import { readJsonBody, sendSuccess, validatePassword } from "../http-utils";
import { ApiException } from "../types";

export async function handleMeRoutes(
  method: string | undefined,
  url: URL,
  res: ServerResponse,
  currentUser: SafeUser,
  req: Parameters<typeof readJsonBody>[0]
): Promise<boolean> {
  if (method === "GET" && url.pathname === "/api/me") {
    const user = await getUserInfo(currentUser.id);
    if (!user) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }

    sendSuccess(res, 200, {
      id: user.id,
      username: user.username,
      elo: user.elo,
      isAdmin: user.isAdmin,
      profile: user.profile,
    });
    return true;
  }

  if (method === "PATCH" && url.pathname === "/api/me/password") {
    const body = await readJsonBody(req);
    const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!oldPassword || !newPassword) {
      throw new ApiException(400, "VALIDATION_ERROR", "oldPassword and newPassword are required.");
    }
    validatePassword(newPassword);

    await changeUserPassword(currentUser.id, oldPassword, newPassword);
    sendSuccess(res, 200, { updated: true });
    return true;
  }

  if (method === "PATCH" && url.pathname === "/api/me/profile") {
    const body = await readJsonBody(req);

    const bioRaw = body.bio;
    const avatarUrlRaw = body.avatarUrl;

    const profilePatch: { bio?: string; avatarUrl?: string } = {};

    if (typeof bioRaw === "string") {
      profilePatch.bio = bioRaw.trim().slice(0, 500);
    }
    if (typeof avatarUrlRaw === "string") {
      profilePatch.avatarUrl = avatarUrlRaw.trim().slice(0, 300);
    }

    const profile = await updateProfile(currentUser.id, profilePatch);
    sendSuccess(res, 200, profile);
    return true;
  }

  if (method === "GET" && url.pathname === "/api/me/elo") {
    const elo = await getUserElo(currentUser.id);
    sendSuccess(res, 200, { elo });
    return true;
  }

  // Own achievements
  if (method === "GET" && url.pathname === "/api/me/achievements") {
    const achievements = await getUserAchievements(currentUser.id);
    sendSuccess(res, 200, achievements);
    return true;
  }

  // Public profile achievements by username
  const profileAchievementsMatch = url.pathname.match(/^\/api\/users\/([^/]+)\/achievements$/);
  if (method === "GET" && profileAchievementsMatch) {
    const username = decodeURIComponent(profileAchievementsMatch[1]);
    const targetUser = await getUserByUsername(username);
    if (!targetUser) {
      throw new ApiException(404, "NOT_FOUND", "user not found.");
    }
    const achievements = await getUserAchievements(targetUser.id);
    sendSuccess(res, 200, achievements);
    return true;
  }

  return false;
}
