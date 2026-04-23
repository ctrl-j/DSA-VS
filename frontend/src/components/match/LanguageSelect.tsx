import './LanguageSelect.css';

const LANGUAGES = [
  { value: 'python', label: 'Python', monacoId: 'python' },
  { value: 'cpp', label: 'C++', monacoId: 'cpp' },
  { value: 'java', label: 'Java', monacoId: 'java' },
];

interface LanguageSelectProps {
  value: string;
  onChange: (lang: string) => void;
  disabled?: boolean;
}

export default function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  return (
    <div className="language-select-wrapper">
      <select
        className="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
