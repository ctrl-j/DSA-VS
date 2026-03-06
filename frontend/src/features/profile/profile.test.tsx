import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { aliceSession } from "../../test/test-data";

describe("profile", () => {
  it("loads current profile", async () => {
    renderApp("/profile", aliceSession);
    expect(await screen.findByText(/Username: alice/)).toBeInTheDocument();
    expect(screen.getByText(/Elo: 1200/)).toBeInTheDocument();
  });

  it("updates profile successfully", async () => {
    const user = userEvent.setup();
    renderApp("/profile/edit", aliceSession);

    await screen.findByDisplayValue("Alice bio");
    const bio = screen.getByLabelText("Bio");
    await user.clear(bio);
    await user.type(bio, "Updated bio");
    await user.clear(screen.getByLabelText("Avatar URL"));
    await user.type(screen.getByLabelText("Avatar URL"), "https://img/new.png");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(await screen.findByText(/Bio: Updated bio/)).toBeInTheDocument();
  });

  it("rejects invalid profile update", async () => {
    const user = userEvent.setup();
    renderApp("/profile/edit", aliceSession);

    await screen.findByDisplayValue("https://img/alice.png");
    await user.clear(screen.getByLabelText("Avatar URL"));
    await user.type(screen.getByLabelText("Avatar URL"), "not-url");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("avatar URL must start");
  });
});
