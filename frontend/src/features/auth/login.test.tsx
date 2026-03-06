import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";

describe("login", () => {
  it("logs in with valid credentials", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });

  it("stays logged out on invalid credentials", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("redirects unauthenticated user from private route", async () => {
    renderApp("/profile");
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("shows banned-user denial message on login", async () => {
    const user = userEvent.setup();
    renderApp("/login");

    await user.type(screen.getByLabelText("Username"), "banned");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("banned");
  });
});
