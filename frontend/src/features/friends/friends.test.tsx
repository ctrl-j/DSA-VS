import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { sendFriendRequest } from "./friends-service";
import { aliceSession, bobSession } from "../../test/test-data";
import { db } from "../../mocks/mock-db";

describe("friends", () => {
  it("sends friend request", async () => {
    const user = userEvent.setup();
    renderApp("/friends", aliceSession);

    await user.type(screen.getByLabelText("Friend username"), "bob");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("Friend request pending.")).toBeInTheDocument();
  });

  it("accepts pending friend request", async () => {
    const user = userEvent.setup();
    renderApp("/friends", bobSession);

    db.sessions.set(aliceSession.token, "alice");
    await sendFriendRequest(aliceSession.token, "bob");
    expect(await screen.findByText("alice", {}, { timeout: 3500 })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Accept" }));

    expect(await screen.findByText("alice")).toBeInTheDocument();
  });

  it("prevents duplicate friend request", async () => {
    const user = userEvent.setup();
    renderApp("/friends", aliceSession);

    await user.type(screen.getByLabelText("Friend username"), "bob");
    await user.click(screen.getByRole("button", { name: "Send request" }));
    await user.type(screen.getByLabelText("Friend username"), "bob");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already pending");
  });
});
