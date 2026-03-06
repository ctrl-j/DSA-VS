import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { aliceSession } from "../../test/test-data";

describe("queue", () => {
  it("joins ranked queue", async () => {
    const user = userEvent.setup();
    renderApp("/queue", aliceSession);
    await user.click(screen.getByRole("button", { name: "Join ranked" }));
    expect(await screen.findByText(/Mode: ranked/)).toBeInTheDocument();
  });

  it("leaves ranked queue", async () => {
    const user = userEvent.setup();
    renderApp("/queue", aliceSession);
    await user.click(screen.getByRole("button", { name: "Join ranked" }));
    await user.click(screen.getByRole("button", { name: "Leave queue" }));
    expect(await screen.findByText(/Queued: No/)).toBeInTheDocument();
  });

  it("prevents duplicate ranked queue join state", async () => {
    const user = userEvent.setup();
    renderApp("/queue", aliceSession);
    await user.click(screen.getByRole("button", { name: "Join ranked" }));
    await user.click(screen.getByRole("button", { name: "Join ranked" }));
    expect(await screen.findByText(/Queued: Yes/)).toBeInTheDocument();
  });

  it("joins ffa queue", async () => {
    const user = userEvent.setup();
    renderApp("/queue", aliceSession);
    await user.click(screen.getByRole("button", { name: "Join FFA" }));
    expect(await screen.findByText(/Mode: ffa/)).toBeInTheDocument();
  });

  it("leaves ffa queue", async () => {
    const user = userEvent.setup();
    renderApp("/queue", aliceSession);
    await user.click(screen.getByRole("button", { name: "Join FFA" }));
    await user.click(screen.getByRole("button", { name: "Leave queue" }));
    expect(await screen.findByText(/Queued: No/)).toBeInTheDocument();
  });

  it("cannot join ffa while ranked queued", async () => {
    const user = userEvent.setup();
    renderApp("/queue", aliceSession);
    await user.click(screen.getByRole("button", { name: "Join ranked" }));
    await user.click(screen.getByRole("button", { name: "Join FFA" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("different mode");
    expect(screen.getByText(/Mode: ranked/)).toBeInTheDocument();
  });
});
