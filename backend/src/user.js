class User {
  constructor({ userId, username, elo, authenticated }) {
    this.userId = userId;
    this.username = username;

    if (typeof elo === "number") {
      this.elo = elo;
    } else {
      this.elo = 1000;
    }

    if (typeof authenticated === "boolean") {
      this.authenticated = authenticated;
    } else {
      this.authenticated = false;
    }
  }

  static fromPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("User payload is required.");
    }

    let rawId;
    if (payload.userId !== undefined && payload.userId !== null) {
      rawId = payload.userId;
    } else {
      rawId = payload.id;
    }

    let userId;
    if (typeof rawId === "string") {
      userId = rawId.trim();
    } else {
      userId = "";
    }

    if (!userId) {
      throw new Error("userId is required.");
    }

    let username;
    if (typeof payload.username === "string") {
      const trimmedUsername = payload.username.trim();
      if (trimmedUsername) {
        username = trimmedUsername;
      } else {
        username = userId;
      }
    } else {
      username = userId;
    }

    const parsedElo = Number(payload.elo);
    let elo;
    if (Number.isFinite(parsedElo)) {
      const flooredElo = Math.floor(parsedElo);
      if (flooredElo < 0) {
        elo = 0;
      } else {
        elo = flooredElo;
      }
    } else {
      elo = 1000;
    }

    let authenticated;
    if (payload.authenticated) {
      authenticated = true;
    } else {
      authenticated = false;
    }

    return new User({
      userId,
      username,
      elo,
      authenticated,
    });
  }
}

module.exports = { User };
