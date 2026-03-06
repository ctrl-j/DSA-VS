import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { aliceSession } from "../../test/test-data";

describe("messaging + blocking", () => {
  it("blocks message sending when users are blocked", async () => {
    const user = userEvent.setup();
    const blockedView = renderApp("/blocked", aliceSession);

    await user.type(screen.getByLabelText("Username to block"), "bob");
    await user.click(screen.getByRole("button", { name: "Block" }));
    await screen.findByText("bob");

    blockedView.unmount();
    renderApp("/messages", aliceSession);
    await user.type(screen.getByLabelText("Conversation username"), "bob");
    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("blocked");
  });

  it("allows message sending after unblock", async () => {
    const user = userEvent.setup();
    const blockedView = renderApp("/blocked", aliceSession);

    await user.type(screen.getByLabelText("Username to block"), "bob");
    await user.click(screen.getByRole("button", { name: "Block" }));
    await user.click(await screen.findByRole("button", { name: "Unblock" }));

    blockedView.unmount();
    renderApp("/messages", aliceSession);
    await user.type(screen.getByLabelText("Conversation username"), "bob");
    await user.type(screen.getByLabelText("Message"), "hello again");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Message sent.")).toBeInTheDocument();
  });
});
