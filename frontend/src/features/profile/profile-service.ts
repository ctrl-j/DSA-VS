import { apiRequest } from "../../services/api/client";
import { Profile, User } from "../../types/models";

export function getProfile(token: string) {
  return apiRequest<User>("/api/me", { token });
}

export function updateProfile(token: string, profile: { bio?: string; avatarUrl?: string }) {
  return apiRequest<Profile>("/api/me/profile", {
    method: "PATCH",
    token,
    body: profile,
  });
}

export function changePassword(token: string, oldPassword: string, newPassword: string) {
  return apiRequest<{ updated: boolean }>("/api/me/password", {
    method: "PATCH",
    token,
    body: { oldPassword, newPassword },
  });
}

export function getElo(token: string) {
  return apiRequest<{ elo: number | null }>("/api/me/elo", { token });
}
