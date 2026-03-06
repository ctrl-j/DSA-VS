import { FormEvent, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { useAuth } from "../hooks/useAuth";
import { submitBugReport } from "../features/reports/reports-service";

export function ReportBugPage() {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (!title.trim() || !description.trim()) {
      return setError("title and description are required");
    }

    try {
      await submitBugReport(token, { title: title.trim(), description: description.trim() });
      setMessage("Bug report saved.");
      setTitle("");
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bug report failed.");
    }
  };

  return (
    <section>
      <h1>Report Bug</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Title" value={title} onChange={setTitle} />
        <TextInput label="Description" value={description} onChange={setDescription} />
        <button type="submit">Submit bug</button>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
