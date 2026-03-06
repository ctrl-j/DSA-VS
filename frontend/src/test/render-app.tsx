import { render } from "@testing-library/react";
import { App } from "../app/App";
import { db } from "../mocks/mock-db";

interface Session {
  token: string;
  user: {
    id: string;
    username: string;
    elo: number;
    isAdmin?: boolean;
  };
}

export function renderApp(path = "/", session?: Session) {
  window.history.pushState({}, "", path);
  if (session) {
    localStorage.setItem("dsavs-auth", JSON.stringify(session));
    db.sessions.set(session.token, session.user.username);
  }
  return render(<App />);
}
