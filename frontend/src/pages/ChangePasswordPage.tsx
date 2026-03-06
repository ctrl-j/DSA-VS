import { FormEvent, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { useAuth } from "../hooks/useAuth";
import { changePassword } from "../features/profile/profile-service";

export function ChangePasswordPage() {
  const { token } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (!oldPassword || !newPassword) return setError("All password fields are required.");
    if (newPassword.length < 8) return setError("password min length is 8");
    if (newPassword !== confirmPassword) return setError("passwords must match");

    try {
      await changePassword(token, oldPassword, newPassword);
      setMessage("Password changed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password change failed.");
    }
  };

  return (
    <section>
      <h1>Change Password</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Current Password" value={oldPassword} onChange={setOldPassword} type="password" />
        <TextInput label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
        <TextInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
        />
        <button type="submit">Update password</button>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
