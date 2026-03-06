import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";

describe("register", () => {
  it("creates account for valid username/password", async () => {
    const user = userEvent.setup();
    renderApp("/register");

    await user.type(screen.getByLabelText("Username"), "newuser");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Account created.")).toBeInTheDocument();
  });

  it("shows duplicate username error", async () => {
    const user = userEvent.setup();
    renderApp("/register");

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.type(screen.getByLabelText("Confirm Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("username is already taken");
  });

  it("rejects invalid inputs", async () => {
    const user = userEvent.setup();
    renderApp("/register");

    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("username required");
  });
});
