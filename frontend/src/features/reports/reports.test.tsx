import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../test/render-app";
import { adminSession, aliceSession } from "../../test/test-data";

describe("reports", () => {
  it("submits a user report", async () => {
    const user = userEvent.setup();
    renderApp("/report-user", aliceSession);

    await user.type(screen.getByLabelText("Reported username"), "bob");
    await user.type(screen.getByLabelText("Reason"), "abuse");
    await user.click(screen.getByRole("button", { name: "Submit report" }));

    expect(await screen.findByText("Report saved.")).toBeInTheDocument();
  });

  it("submits bug report", async () => {
    const user = userEvent.setup();
    renderApp("/report-bug", aliceSession);

    await user.type(screen.getByLabelText("Title"), "UI bug");
    await user.type(screen.getByLabelText("Description"), "steps");
    await user.click(screen.getByRole("button", { name: "Submit bug" }));

    expect(await screen.findByText("Bug report saved.")).toBeInTheDocument();
  });

  it("validates bug report required fields", async () => {
    const user = userEvent.setup();
    renderApp("/report-bug", aliceSession);

    await user.click(screen.getByRole("button", { name: "Submit bug" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("required");
  });

  it("shows admin bug report list for admin users", async () => {
    renderApp("/admin/bug-reports", adminSession);
    expect(await screen.findByText("Sample bug")).toBeInTheDocument();
  });

  it("hides admin bug report list from non-admin users", async () => {
    renderApp("/admin/bug-reports", aliceSession);
    expect(await screen.findByRole("alert")).toHaveTextContent("admin only");
  });
});
