import "./TestCaseSubmitPage.css";
import { FormEvent, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

interface ProblemEditResponse {
  id: string;
  title: string;
  _count: { testCases: number };
}

interface ProblemInfo {
  id: string;
  title: string;
  testCaseCount: number;
}

/** Only printable ASCII, newlines, and tabs are allowed in test case fields. */
const SPECIAL_CHAR_RE = /[^\x20-\x7E\n\t]/;

export function TestCaseSubmitPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [isHidden, setIsHidden] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function loadProblem() {
      try {
        const data = await api<ProblemEditResponse>("GET", `/api/problems/${id}/edit`, {
          token: token!,
        });
        if (!cancelled) {
          setProblem({
            id: data.id,
            title: data.title,
            testCaseCount: data._count.testCases,
          });
          setPageError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Failed to load problem.";
          setPageError(msg);
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    loadProblem();
    return () => { cancelled = true; };
  }, [token, id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !id) return;
    setError(null);
    setMessage(null);

    if (!input.trim() || !expectedOutput.trim()) {
      return setError("Input and Expected Output are required.");
    }

    if (SPECIAL_CHAR_RE.test(input) || SPECIAL_CHAR_RE.test(expectedOutput)) {
      return setError("Special characters are not allowed. Use only standard ASCII characters.");
    }

    setSubmitting(true);
    try {
      await api("POST", `/api/problems/${id}/test-cases/submit`, {
        token,
        body: {
          input: input.trim(),
          expectedOutput: expectedOutput.trim(),
          isHidden,
        },
      });
      setAddedCount((prev) => prev + 1);
      if (problem) {
        setProblem({ ...problem, testCaseCount: problem.testCaseCount + 1 });
      }
      setMessage("Test case added successfully.");
      setInput("");
      setExpectedOutput("");
      setIsHidden(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to add test case.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="tc-submit-page">
        <div className="tc-submit__loading">Loading problem...</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="tc-submit-page">
        <div className="tc-submit__error">{pageError}</div>
      </div>
    );
  }

  return (
    <div className="tc-submit-page">
      <h1 className="tc-submit__title">
        {problem ? problem.title : "Add Test Cases"}
      </h1>

      {problem && (
        <p className="tc-submit__count">
          Current test cases: <span className="tc-submit__count-value">{problem.testCaseCount}</span>
        </p>
      )}

      <form className="tc-submit__form" onSubmit={onSubmit}>
        <div className="tc-submit__field">
          <label className="tc-submit__label">Input</label>
          <textarea
            className="tc-submit__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='e.g. [[2,7,11,15],9]'
          />
        </div>

        <div className="tc-submit__field">
          <label className="tc-submit__label">Expected Output</label>
          <textarea
            className="tc-submit__textarea"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder='e.g. [0,1]'
          />
        </div>

        <div className="tc-submit__checkbox-field">
          <label className="tc-submit__checkbox-label">
            <input
              type="checkbox"
              className="tc-submit__checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
            />
            Hidden test case
          </label>
        </div>

        <button
          type="submit"
          className="tc-submit__submit"
          disabled={submitting}
        >
          {submitting ? "Adding..." : "Add Test Case"}
        </button>
      </form>

      {message && <p className="tc-submit__message">{message}</p>}
      {error && <p className="tc-submit__form-error" role="alert">{error}</p>}

      {addedCount > 0 && (
        <div className="tc-submit__summary">
          Added: {addedCount} test case{addedCount !== 1 ? "s" : ""} this session
        </div>
      )}
    </div>
  );
}
