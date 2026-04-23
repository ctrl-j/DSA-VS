import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './MatchPage.css';

import { useAuth } from '../providers/AuthProvider';
import { useWs } from '../providers/WebSocketProvider';
import { api } from '../services/api';

import MatchHeader from '../components/match/MatchHeader';
import ProblemPanel from '../components/match/ProblemPanel';
import CodeEditor from '../components/match/CodeEditor';
import LanguageSelect from '../components/match/LanguageSelect';
import TestResults from '../components/match/TestResults';

import type {
  Match,
  Problem,
  TestCaseResult,
  SubmissionStatus,
  WsMatchTick,
  WsMatchProgress,
  WsSubmissionAccepted,
  WsSubmissionUpdate,
  WsMatchEnded,
} from '../types';

interface MatchEndedState {
  winnerUserId: string | null;
  eloDelta: number;
}

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { subscribe, send } = useWs();

  // Match data
  const [match, setMatch] = useState<Match | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live state
  const [remainingMs, setRemainingMs] = useState(0);
  const [mePassed, setMePassed] = useState(0);
  const [opponentPassed, setOpponentPassed] = useState(0);
  const [totalTests, setTotalTests] = useState(0);

  // Submission state
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [submissionError, setSubmissionError] = useState<string | undefined>();

  // Match ended
  const [matchEnded, setMatchEnded] = useState<MatchEndedState | null>(null);

  // Solution viewer
  const [solutionText, setSolutionText] = useState<string | null>(null);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Cancel vote state
  const [cancelState, setCancelState] = useState<
    'idle' | 'waiting' | 'proposed' | 'rejected'
  >('idle');
  const [cancelProposedBy, setCancelProposedBy] = useState<string>('');

  // Editor state — initialize from preferred language in localStorage
  const [language, setLanguage] = useState(
    () => localStorage.getItem('dsavs-preferred-lang') || 'python'
  );
  const [code, setCode] = useState('');

  // Draft auto-save state
  const lastSavedCodeRef = useRef('');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const draftRestoredRef = useRef(false);
  const templateLoadedRef = useRef(false);

  // Handle language change with template switching
  const handleLanguageChange = useCallback(
    (newLang: string) => {
      if (problem?.templates && !draftRestoredRef.current) {
        const oldLang = language as keyof NonNullable<Problem['templates']>;
        const oldTemplate = problem.templates[oldLang] ?? '';
        // Switch template only if user hasn't modified the code from the template
        if (code === oldTemplate || code === '') {
          const newTemplate = problem.templates[newLang as keyof NonNullable<Problem['templates']>] ?? '';
          setCode(newTemplate);
        }
      }
      setLanguage(newLang);
      localStorage.setItem('dsavs-preferred-lang', newLang);
    },
    [language, code, problem]
  );

  // Derived
  const myUsername = user?.username ?? 'You';
  const opponent = match?.participants.find((p) => p.userId !== user?.id);
  const opponentUsername = opponent?.user.username ?? 'Opponent';

  // Fetch match data on mount
  useEffect(() => {
    if (!matchId || !token) return;

    let cancelled = false;

    async function fetchMatch() {
      try {
        const data = await api<Match>('GET', `/api/matches/${matchId}`, { token: token! });
        if (cancelled) return;

        setMatch(data);
        setProblem(data.problem);

        if (data.durationSec) {
          setRemainingMs(data.durationSec * 1000);
        }

        if (data.status === 'COMPLETED') {
          setMatchEnded({ winnerUserId: null, eloDelta: 0 });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load match');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMatch();
    return () => { cancelled = true; };
  }, [matchId, token]);

  // Restore saved draft on mount
  useEffect(() => {
    if (!matchId || !token) return;

    let cancelled = false;

    async function fetchDraft() {
      try {
        const data = await api<{ code: string | null }>('GET', `/api/matches/${matchId}/draft`, { token: token! });
        if (!cancelled && data.code) {
          setCode(data.code);
          lastSavedCodeRef.current = data.code;
          draftRestoredRef.current = true;
        }
      } catch {
        // Draft may not exist yet, ignore
      }
    }

    fetchDraft();
    return () => { cancelled = true; };
  }, [matchId, token]);

  // Load template code when problem arrives (only if no draft was restored)
  useEffect(() => {
    if (!problem?.templates || draftRestoredRef.current || templateLoadedRef.current) return;
    const lang = language as keyof typeof problem.templates;
    const tmpl = problem.templates[lang];
    if (tmpl) {
      setCode(tmpl);
      templateLoadedRef.current = true;
    }
  }, [problem, language]);

  // Auto-save draft every 10 seconds
  useEffect(() => {
    if (!matchId || !token || matchEnded) return;

    const interval = setInterval(async () => {
      if (code === lastSavedCodeRef.current) return;
      if (!code.trim()) return;

      setDraftStatus('saving');
      try {
        await api('POST', `/api/matches/${matchId}/draft`, {
          token: token!,
          body: { code },
        });
        lastSavedCodeRef.current = code;
        setDraftStatus('saved');
        setTimeout(() => setDraftStatus('idle'), 2000);
      } catch {
        setDraftStatus('idle');
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [matchId, token, code, matchEnded]);

  // WebSocket subscriptions
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribe('match.tick', (payload: WsMatchTick) => {
        if (payload.matchId === matchId) {
          setRemainingMs(payload.remainingMs);
        }
      })
    );

    unsubs.push(
      subscribe('match.progress', (payload: WsMatchProgress) => {
        if (payload.matchId === matchId) {
          setMePassed(payload.mePassed);
          setOpponentPassed(payload.opponentPassed);
        }
      })
    );

    unsubs.push(
      subscribe('submission.accepted', (payload: WsSubmissionAccepted) => {
        if (payload.matchId === matchId) {
          setSubmissionStatus(payload.status);
        }
      })
    );

    unsubs.push(
      subscribe('submission.update', (payload: WsSubmissionUpdate) => {
        setSubmissionStatus(payload.status);
        if (payload.results) {
          setTestResults(payload.results);
        }
        if (payload.totalCount !== undefined) {
          setTotalTests(payload.totalCount);
        }
        if (payload.error) {
          setSubmissionError(payload.error);
        }
      })
    );

    unsubs.push(
      subscribe('match.ended', (payload: WsMatchEnded) => {
        if (payload.matchId === matchId) {
          setMatchEnded({
            winnerUserId: payload.winnerUserId,
            eloDelta: payload.eloDelta,
          });
        }
      })
    );

    // Cancel vote events
    unsubs.push(
      subscribe('match.cancel.waiting', (payload: { matchId: string }) => {
        if (payload.matchId === matchId) {
          setCancelState('waiting');
        }
      })
    );

    unsubs.push(
      subscribe('match.cancel.proposed', (payload: { matchId: string; requestedBy: string }) => {
        if (payload.matchId === matchId) {
          setCancelState('proposed');
          setCancelProposedBy(payload.requestedBy);
        }
      })
    );

    unsubs.push(
      subscribe('match.cancel.rejected', (payload: { matchId: string }) => {
        if (payload.matchId === matchId) {
          setCancelState('rejected');
          // Reset after 3 seconds so they can try again
          setTimeout(() => setCancelState('idle'), 3000);
        }
      })
    );

    unsubs.push(
      subscribe('match.cancelled', (payload: { matchId: string }) => {
        if (payload.matchId === matchId) {
          navigate('/dashboard');
        }
      })
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [subscribe, matchId, navigate]);

  // Submit code
  const handleSubmit = useCallback(() => {
    if (!matchId || matchEnded) return;

    setSubmissionStatus('QUEUED');
    setTestResults([]);
    setSubmissionError(undefined);

    send('submission.create', {
      matchId,
      language,
      code,
    });
  }, [matchId, language, code, send, matchEnded]);

  // Cancel match handlers
  const handleCancelRequest = useCallback(() => {
    if (!matchId || matchEnded) return;
    send('match.cancel.request', { matchId });
  }, [matchId, send, matchEnded]);

  const handleCancelAccept = useCallback(() => {
    if (!matchId) return;
    send('match.cancel.accept', { matchId });
  }, [matchId, send]);

  const handleCancelDecline = useCallback(() => {
    if (!matchId) return;
    send('match.cancel.decline', { matchId });
    setCancelState('idle');
  }, [matchId, send]);

  // Toggle solution viewer
  const handleToggleSolution = useCallback(async () => {
    if (showSolution) {
      setShowSolution(false);
      return;
    }

    // If we already fetched it, just show it
    if (solutionText !== null) {
      setShowSolution(true);
      return;
    }

    // Fetch solution from API
    if (!matchId || !token) return;
    setSolutionLoading(true);
    try {
      const data = await api<{ solution: string }>('GET', `/api/matches/${matchId}/solution`, { token });
      setSolutionText(data.solution);
      setShowSolution(true);
    } catch {
      setSolutionText('Failed to load solution.');
      setShowSolution(true);
    } finally {
      setSolutionLoading(false);
    }
  }, [showSolution, solutionText, matchId, token]);

  // Loading / error states
  if (loading) {
    return <div className="match-loading">Loading match...</div>;
  }

  if (error) {
    return (
      <div className="match-error">
        <div className="match-error-message">{error}</div>
        <button className="match-error-back" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Determine win/loss/draw for overlay
  const isWin = matchEnded && matchEnded.winnerUserId === user?.id;
  const isDraw = matchEnded && matchEnded.winnerUserId === null;
  const isLoss = matchEnded && !isWin && !isDraw;

  const submitting = submissionStatus === 'QUEUED' || submissionStatus === 'RUNNING';

  return (
    <div className="match-page">
      <MatchHeader
        remainingMs={remainingMs}
        myUsername={myUsername}
        opponentUsername={opponentUsername}
        mePassed={mePassed}
        opponentPassed={opponentPassed}
        totalTests={totalTests}
        matchEnded={!!matchEnded}
      />

      <div className="match-body">
        <div className="match-left">
          <ProblemPanel problem={problem} />
        </div>

        <div className="match-right">
          <div className="match-editor-area">
            <div className="match-editor-toolbar">
              <LanguageSelect
                value={language}
                onChange={handleLanguageChange}
                disabled={submitting}
              />
              {draftStatus !== 'idle' && (
                <span className={`match-draft-status match-draft-status--${draftStatus}`}>
                  {draftStatus === 'saving' ? 'Saving...' : 'Saved'}
                </span>
              )}
              <button
                className="match-submit-btn"
                onClick={handleSubmit}
                disabled={submitting || !!matchEnded || !code.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                className="match-cancel-btn"
                onClick={handleCancelRequest}
                disabled={!!matchEnded || cancelState !== 'idle'}
              >
                {cancelState === 'waiting'
                  ? 'Waiting...'
                  : cancelState === 'rejected'
                  ? 'Declined'
                  : 'Cancel Match'}
              </button>
            </div>
            <div className="match-editor-container">
              <CodeEditor
                language={language}
                value={code}
                onChange={setCode}
                disabled={!!matchEnded}
              />
            </div>
          </div>

          <div className="match-results-area">
            <TestResults
              results={testResults}
              status={submissionStatus}
              error={submissionError}
            />
          </div>
        </div>
      </div>

      {cancelState === 'proposed' && (
        <div className="match-cancel-overlay">
          <div className="match-cancel-card">
            <div className="match-cancel-title">Cancel Match?</div>
            <div className="match-cancel-text">
              {cancelProposedBy} wants to cancel this match. Do you agree?
            </div>
            <div className="match-cancel-actions">
              <button className="match-cancel-accept" onClick={handleCancelAccept}>
                Accept
              </button>
              <button className="match-cancel-decline" onClick={handleCancelDecline}>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {matchEnded && (
        <div className="match-ended-overlay">
          <div className="match-ended-card">
            <div
              className={`match-ended-title ${
                isWin
                  ? 'match-ended-title--win'
                  : isLoss
                  ? 'match-ended-title--lose'
                  : 'match-ended-title--draw'
              }`}
            >
              {isWin ? 'Victory' : isLoss ? 'Defeat' : 'Draw'}
            </div>
            <div
              className={`match-ended-elo ${
                matchEnded.eloDelta > 0
                  ? 'match-ended-elo--positive'
                  : matchEnded.eloDelta < 0
                  ? 'match-ended-elo--negative'
                  : 'match-ended-elo--zero'
              }`}
            >
              {matchEnded.eloDelta > 0 ? '+' : ''}
              {matchEnded.eloDelta} ELO
            </div>
            <div className="match-ended-actions">
              <button
                className="match-ended-btn"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
