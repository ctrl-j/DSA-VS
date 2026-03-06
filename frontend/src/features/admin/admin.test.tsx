import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { adminSession, aliceSession } from "../../test/test-data";

describe("admin pages", () => {
  it("protects admin chats from non-admin users", async () => {
    renderApp("/admin/chats", aliceSession);
    expect(await screen.findByRole("alert")).toHaveTextContent("admin only");
  });

  it("loads and filters admin chats", async () => {
    const user = userEvent.setup();
    renderApp("/admin/chats", adminSession);

    await user.type(screen.getByLabelText("Username 1"), "alice");
    await user.type(screen.getByLabelText("Username 2"), "bob");
    await user.click(screen.getByRole("button", { name: "Load chats" }));
    expect(await screen.findByText("alice: hello bob")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search"), "missing");
    expect(await screen.findByText("No chats.")).toBeInTheDocument();
  });
});
