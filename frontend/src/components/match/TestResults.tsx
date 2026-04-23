import { useState } from 'react';
import './TestResults.css';
import type { TestCaseResult, SubmissionStatus } from '../../types';

interface TestResultsProps {
  results: TestCaseResult[];
  status: SubmissionStatus | null;
  error?: string;
}

export default function TestResults({ results, status, error }: TestResultsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (status === null) {
    return (
      <div className="test-results">
        <div className="test-results-placeholder">
          Submit your code to see results
        </div>
      </div>
    );
  }

  if (status === 'QUEUED') {
    return (
      <div className="test-results">
        <div className="test-results-status">
          <span className="test-results-status-dot" />
          Queued...
        </div>
      </div>
    );
  }

  if (status === 'RUNNING') {
    return (
      <div className="test-results">
        <div className="test-results-status">
          <span className="test-results-status-dot" />
          Running...
        </div>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="test-results">
        <div className="test-results-error">
          {error || 'Submission failed'}
        </div>
      </div>
    );
  }

  const selected = selectedIndex !== null ? results[selectedIndex] : null;

  return (
    <div className="test-results">
      <div className="test-results-header">Test Cases</div>
      <div className="test-results-grid">
        {results.map((r, i) => (
          <button
            key={r.testCaseId}
            className={`test-badge test-badge--${r.verdict} ${selectedIndex === i ? 'test-badge--active' : ''}`}
            onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
            title={r.verdict}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {selected && (
        <div className="test-detail">
          {selected.stdout && (
            <>
              <div className="test-detail-label">stdout</div>
              <div className="test-detail-content">{selected.stdout}</div>
            </>
          )}
          {selected.stderr && (
            <>
              <div className="test-detail-label">stderr</div>
              <div className="test-detail-content">{selected.stderr}</div>
            </>
          )}
          {!selected.stdout && !selected.stderr && (
            <div className="test-detail-content" style={{ color: 'var(--text-muted)' }}>
              No output
            </div>
          )}
        </div>
      )}
    </div>
  );
}
