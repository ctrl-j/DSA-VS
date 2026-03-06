interface TextInputProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  name?: string;
}

export function TextInput({ label, value, onChange, type = "text", name }: TextInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
