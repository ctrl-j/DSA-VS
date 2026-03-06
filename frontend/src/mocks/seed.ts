export interface MockUser {
  id: string;
  username: string;
  password: string;
  elo: number;
  isAdmin: boolean;
  isBanned: boolean;
  profile: { bio: string; avatarUrl: string };
}

export function createSeedUsers(): MockUser[] {
  return [
    {
      id: "u1",
      username: "alice",
      password: "Password123",
      elo: 1200,
      isAdmin: false,
      isBanned: false,
      profile: { bio: "Alice bio", avatarUrl: "https://img/alice.png" },
    },
    {
      id: "u2",
      username: "bob",
      password: "Password123",
      elo: 1250,
      isAdmin: false,
      isBanned: false,
      profile: { bio: "Bob bio", avatarUrl: "https://img/bob.png" },
    },
    {
      id: "u3",
      username: "admin",
      password: "Password123",
      elo: 1400,
      isAdmin: true,
      isBanned: false,
      profile: { bio: "Admin", avatarUrl: "https://img/admin.png" },
    },
    {
      id: "u4",
      username: "banned",
      password: "Password123",
      elo: 900,
      isAdmin: false,
      isBanned: true,
      profile: { bio: "Banned user", avatarUrl: "" },
    },
  ];
}
