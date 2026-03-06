import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextInput } from "../components/forms/TextInput";
import { useAuth } from "../hooks/useAuth";
import { getProfile, updateProfile } from "../features/profile/profile-service";

export function EditProfilePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        const user = await getProfile(token);
        setBio(user.profile?.bio ?? "");
        setAvatarUrl(user.profile?.avatarUrl ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Profile load failed.");
      }
    };
    void run();
  }, [token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (avatarUrl && !/^https?:\/\//.test(avatarUrl)) {
      return setError("avatar URL must start with http:// or https://");
    }

    try {
      await updateProfile(token, { bio, avatarUrl });
      setMessage("Profile saved.");
      navigate("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profile update failed.");
    }
  };

  return (
    <section>
      <h1>Edit Profile</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Bio" value={bio} onChange={setBio} />
        <TextInput label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} />
        <button type="submit">Save</button>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
