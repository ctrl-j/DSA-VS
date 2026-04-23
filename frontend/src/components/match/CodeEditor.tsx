import './CodeEditor.css';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function CodeEditor({ language, value, onChange, disabled }: CodeEditorProps) {
  return (
    <div className="code-editor-wrapper" style={{ position: 'relative' }}>
      {disabled && (
        <div className="code-editor-disabled-overlay">
          Editor locked
        </div>
      )}
      <div className="code-editor-container">
        <Editor
          language={language}
          value={value}
          onChange={(val) => onChange(val ?? '')}
          theme="vs-dark"
          options={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            readOnly: disabled,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
