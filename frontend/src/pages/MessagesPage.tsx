import { FormEvent, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import {
  challengeUser,
  getConversation,
  sendMessageToUser,
} from "../features/messages/messages-service";
import { ChatMessage } from "../types/models";

export function MessagesPage() {
  const { token } = useAuth();
  const [target, setTarget] = useState("");
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!token || !target.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setMessages(await getConversation(token, target.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !target.trim()) return setError("target username required");
    if (!content.trim()) return setError("message content required");
    setError(null);
    setMessage(null);
    try {
      await sendMessageToUser(token, target.trim(), content.trim());
      setContent("");
      setMessage("Message sent.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed.");
    }
  };

  return (
    <section>
      <h1>Messages</h1>
      <div>
        <TextInput label="Conversation username" value={target} onChange={setTarget} />
        <button type="button" onClick={() => void load()}>Load history</button>
        <button type="button" onClick={() => void challengeUser(token!, target.trim()).then(() => setMessage("Challenge sent.")).catch((e: Error) => setError(e.message))}>
          Send challenge
        </button>
      </div>
      <form onSubmit={send}>
        <TextInput label="Message" value={content} onChange={setContent} />
        <button type="submit">Send message</button>
      </form>
      <StatusBox loading={loading} error={error} empty={messages.length === 0} emptyText="No messages." />
      {message && <p>{message}</p>}
      {messages.length > 0 && (
        <ul>
          {messages.map((item) => (
            <li key={item.id}>{item.content}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
