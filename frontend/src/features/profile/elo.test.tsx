import { screen } from "@testing-library/react";
import { renderApp } from "../../test/render-app";
import { aliceSession } from "../../test/test-data";

describe("elo", () => {
  it("shows elo for authenticated user", async () => {
    renderApp("/elo", aliceSession);
    expect(await screen.findByText(/Current Elo: 1200/)).toBeInTheDocument();
  });

  it("denies elo route to unauthenticated user", async () => {
    renderApp("/elo");
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
