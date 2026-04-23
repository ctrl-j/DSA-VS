import './ProblemPanel.css';
import type { Problem } from '../../types';

interface ProblemPanelProps {
  problem: Problem | null;
}

/** Parse backtick-wrapped segments into <code> elements */
function renderInlineCode(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <code key={key++} className="problem-inline-code">
        {match[1]}
      </code>
    );
    last = regex.lastIndex;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

interface StatementSection {
  type: 'description' | 'example' | 'constraints';
  title?: string;
  lines: string[];
}

function parseStatement(statement: string): StatementSection[] {
  const lines = statement.split('\n');
  const sections: StatementSection[] = [];
  let current: StatementSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^\*?\*?Example\s*\d*\s*:\*?\*?/i.test(trimmed)) {
      if (current) sections.push(current);
      current = { type: 'example', title: trimmed.replace(/\*\*/g, ''), lines: [] };
    } else if (/^\*?\*?Constraints\s*:\*?\*?/i.test(trimmed)) {
      if (current) sections.push(current);
      current = { type: 'constraints', title: trimmed.replace(/\*\*/g, ''), lines: [] };
    } else {
      if (!current) {
        current = { type: 'description', lines: [] };
      }
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections;
}

export default function ProblemPanel({ problem }: ProblemPanelProps) {
  if (!problem) {
    return (
      <div className="problem-panel">
        <div className="problem-panel-loading">Loading problem</div>
      </div>
    );
  }

  const difficultyClass = problem.difficulty.toLowerCase();
  const sections = parseStatement(problem.statement);

  return (
    <div className="problem-panel">
      <div className="problem-header">
        <h2 className="problem-title">{problem.title}</h2>
        <div className="problem-tags">
          <span className={`problem-badge problem-badge--${difficultyClass}`}>
            {problem.difficulty}
          </span>
          {problem.category && (
            <span className="problem-badge problem-badge--category">
              {problem.category}
            </span>
          )}
        </div>
      </div>

      <div className="problem-statement">
        {sections.map((section, idx) => {
          switch (section.type) {
            case 'description':
              return (
                <div key={idx} className="problem-description">
                  {section.lines.map((line, j) => (
                    <div key={j}>{renderInlineCode(line)}</div>
                  ))}
                </div>
              );

            case 'example':
              return (
                <div key={idx} className="problem-example">
                  <div className="problem-section-title">{section.title}</div>
                  <div className="problem-example-body">
                    {section.lines.map((line, j) => {
                      const trimmed = line.trim();
                      if (/^Input\s*:/i.test(trimmed)) {
                        return (
                          <div key={j} className="problem-io-line">
                            <span className="problem-io-label">Input:</span>{' '}
                            {renderInlineCode(trimmed.replace(/^Input\s*:\s*/i, ''))}
                          </div>
                        );
                      }
                      if (/^Output\s*:/i.test(trimmed)) {
                        return (
                          <div key={j} className="problem-io-line">
                            <span className="problem-io-label">Output:</span>{' '}
                            {renderInlineCode(trimmed.replace(/^Output\s*:\s*/i, ''))}
                          </div>
                        );
                      }
                      if (/^Explanation\s*:/i.test(trimmed)) {
                        return (
                          <div key={j} className="problem-explanation">
                            <span className="problem-io-label">Explanation:</span>{' '}
                            {renderInlineCode(trimmed.replace(/^Explanation\s*:\s*/i, ''))}
                          </div>
                        );
                      }
                      return (
                        <div key={j}>{renderInlineCode(line)}</div>
                      );
                    })}
                  </div>
                </div>
              );

            case 'constraints':
              return (
                <div key={idx} className="problem-constraints">
                  <div className="problem-section-title">{section.title}</div>
                  <ul className="problem-constraints-list">
                    {section.lines
                      .filter((l) => l.trim() !== '')
                      .map((line, j) => (
                        <li key={j}>
                          {renderInlineCode(line.replace(/^\s*[-*]\s*/, ''))}
                        </li>
                      ))}
                  </ul>
                </div>
              );

            default:
              return null;
          }
        })}
      </div>

      <div className="problem-limits">
        <span>Time: {problem.timeLimitMs}ms</span>
        <span>Memory: {problem.memoryLimitMb}MB</span>
      </div>
    </div>
  );
}
