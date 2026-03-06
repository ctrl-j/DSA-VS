import { FormEvent, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { useAuth } from "../hooks/useAuth";
import { submitUserReport } from "../features/reports/reports-service";

export function ReportUserPage() {
  const { token } = useAuth();
  const [reportedUsername, setReportedUsername] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (!reportedUsername.trim() || !reason.trim()) {
      return setError("reported username and reason are required");
    }

    try {
      await submitUserReport(token, { reportedUsername: reportedUsername.trim(), reason: reason.trim() });
      setMessage("Report saved.");
      setReportedUsername("");
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report failed.");
    }
  };

  return (
    <section>
      <h1>Report User</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Reported username" value={reportedUsername} onChange={setReportedUsername} />
        <TextInput label="Reason" value={reason} onChange={setReason} />
        <button type="submit">Submit report</button>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
