import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { aliceSession } from "../../test/test-data";

describe("change password", () => {
  it("changes password with correct current password", async () => {
    const user = userEvent.setup();
    renderApp("/change-password", aliceSession);

    await user.type(screen.getByLabelText("Current Password"), "Password123");
    await user.type(screen.getByLabelText("New Password"), "NewPassword123");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPassword123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Password changed.")).toBeInTheDocument();
  });

  it("rejects wrong current password", async () => {
    const user = userEvent.setup();
    renderApp("/change-password", aliceSession);

    await user.type(screen.getByLabelText("Current Password"), "WrongCurrent1");
    await user.type(screen.getByLabelText("New Password"), "NewPassword123");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPassword123");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("current password is incorrect");
  });

  it("fails login with old password after change", async () => {
    const user = userEvent.setup();
    const view = renderApp("/change-password", aliceSession);

    await user.type(screen.getByLabelText("Current Password"), "Password123");
    await user.type(screen.getByLabelText("New Password"), "NewPassword123");
    await user.type(screen.getByLabelText("Confirm New Password"), "NewPassword123");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    await screen.findByText("Password changed.");

    view.unmount();
    localStorage.clear();
    renderApp("/login");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "Password123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
  });

  it("allows login with new password after change", async () => {
    const user = userEvent.setup();
    const view = renderApp("/change-password", aliceSession);

    await user.type(screen.getByLabelText("Current Password"), "Password123");
    await user.type(screen.getByLabelText("New Password"), "BrandNew123");
    await user.type(screen.getByLabelText("Confirm New Password"), "BrandNew123");
    await user.click(screen.getByRole("button", { name: "Update password" }));
    await screen.findByText("Password changed.");

    view.unmount();
    localStorage.clear();
    renderApp("/login");
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "BrandNew123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
  });
});
