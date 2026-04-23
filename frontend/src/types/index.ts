// ==========================================================================
// Shared types for the DSA·VS frontend
// ==========================================================================

// ---- Auth ----
export interface User {
  id: string;
  username: string;
  elo: number;
  isAdmin?: boolean;
  isBanned?: boolean;
  profile?: {
    bio?: string;
    avatarUrl?: string;
  };
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

// ---- Match ----
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type MatchMode = "RANKED" | "FFA" | "PRIVATE";
export type MatchStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type SubmissionStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type Verdict =
  | "PASS"
  | "WRONG_ANSWER"
  | "RUNTIME_ERROR"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "COMPILATION_ERROR";

export interface ProblemSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
}

export interface Problem extends ProblemSummary {
  statement: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  functionName?: string;
  templates?: { python: string; cpp: string; java: string };
  drivers?: Record<string, { header: string; footer: string }>;
}

export interface MatchParticipant {
  userId: string;
  startElo: number;
  endElo: number | null;
  passedCount: number;
  reachedPassedAt: string | null;
  user: {
    id: string;
    username: string;
    elo: number;
  };
}

export interface Match {
  id: string;
  mode: MatchMode;
  status: MatchStatus;
  problemId: string | null;
  problem: Problem | null;
  participants: MatchParticipant[];
  submissions: Submission[];
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
}

export interface Submission {
  id: string;
  matchId: string;
  userId: string;
  language: string;
  code: string;
  status: SubmissionStatus;
  passedCount: number | null;
  createdAt: string;
}

export interface TestCaseResult {
  testCaseId: string;
  verdict: Verdict;
  stdout: string;
  stderr: string;
}

// ---- WebSocket payloads ----
export interface WsMatchFound {
  matchId: string;
  opponent: {
    userId: string;
    username: string;
    elo: number;
  };
  problemSummary: ProblemSummary | null;
  startsAt: string;
}

export interface WsMatchTick {
  matchId: string;
  remainingMs: number;
}

export interface WsMatchEnded {
  matchId: string;
  winnerUserId: string | null;
  reason: string;
  eloDelta: number;
}

export interface WsMatchProgress {
  matchId: string;
  mePassed: number;
  opponentPassed: number;
}

export interface WsSubmissionAccepted {
  submissionId: string;
  matchId: string;
  status: SubmissionStatus;
}

export interface WsSubmissionUpdate {
  submissionId: string;
  status: SubmissionStatus;
  passedCount?: number;
  totalCount?: number;
  results?: TestCaseResult[];
  error?: string;
}

// ---- API ----
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

// ---- Match History ----
export interface MatchHistoryEntry {
  match: {
    id: string;
    mode: MatchMode;
    status: MatchStatus;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    durationSec: number;
    problem: ProblemSummary | null;
    participants: {
      userId: string;
      user: { id: string; username: string };
    }[];
  };
  userId: string;
  startElo: number;
  endElo: number | null;
  passedCount: number;
}
