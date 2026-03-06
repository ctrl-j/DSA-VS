import { apiRequest } from "../../services/api/client";
import { User } from "../../types/models";

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export function register(username: string, password: string) {
  return apiRequest<{ userId: string; username: string; elo: number }>("/api/auth/register", {
    method: "POST",
    body: { username, password },
  });
}

export function login(username: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

export function logout(token: string) {
  return apiRequest<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST",
    token,
  });
}

export function getMe(token: string) {
  return apiRequest<User>("/api/me", { token });
}
