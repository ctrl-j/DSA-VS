import './MatchHeader.css';

interface MatchHeaderProps {
  remainingMs: number;
  myUsername: string;
  opponentUsername: string;
  mePassed: number;
  opponentPassed: number;
  totalTests: number;
  matchEnded: boolean;
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function MatchHeader({
  remainingMs,
  myUsername,
  opponentUsername,
  mePassed,
  opponentPassed,
  totalTests,
  matchEnded,
}: MatchHeaderProps) {
  const progressPct = (passed: number) =>
    totalTests > 0 ? (passed / totalTests) * 100 : 0;

  return (
    <div className="match-header">
      <div className="match-player match-player--me">
        <div className="match-player-info">
          <span className="match-player-name">{myUsername}</span>
          <span className="match-player-passed">{mePassed} passed</span>
        </div>
        <div className="match-progress-bar">
          <div
            className="match-progress-fill match-progress-fill--me"
            style={{ width: `${progressPct(mePassed)}%` }}
          />
        </div>
      </div>

      <div className={`match-timer ${matchEnded ? 'match-timer--ended' : ''}`}>
        {matchEnded ? 'MATCH OVER' : formatTime(remainingMs)}
      </div>

      <div className="match-player match-player--opponent">
        <div className="match-progress-bar">
          <div
            className="match-progress-fill match-progress-fill--opponent"
            style={{ width: `${progressPct(opponentPassed)}%` }}
          />
        </div>
        <div className="match-player-info">
          <span className="match-player-name">{opponentUsername}</span>
          <span className="match-player-passed">{opponentPassed} passed</span>
        </div>
      </div>
    </div>
  );
}
