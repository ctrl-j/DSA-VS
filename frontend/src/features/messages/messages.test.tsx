import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { aliceSession } from "../../test/test-data";

describe("messages", () => {
  it("loads message history", async () => {
    const user = userEvent.setup();
    renderApp("/messages", aliceSession);

    await user.type(screen.getByLabelText("Conversation username"), "bob");
    await user.click(screen.getByRole("button", { name: "Load history" }));

    expect(await screen.findByText("hello bob")).toBeInTheDocument();
  });

  it("sends message successfully", async () => {
    const user = userEvent.setup();
    renderApp("/messages", aliceSession);

    await user.type(screen.getByLabelText("Conversation username"), "bob");
    await user.type(screen.getByLabelText("Message"), "new message");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Message sent.")).toBeInTheDocument();
    expect(await screen.findByText("new message")).toBeInTheDocument();
  });
});
