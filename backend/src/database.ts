export { prisma } from "./db/client";

export { hashSessionToken } from "./db/common";

export type { AuthenticatedSession, PublicUserSummary, SafeUser } from "./db/types";

export {
  changeUserPassword,
  checkUserPassword,
  loginUser,
  registerUser,
  updateUserPassword,
} from "./db/auth-repo";

export {
  createSessionForUser,
  deleteSessionByToken,
  deleteSessionsForUser,
  getSessionByToken,
} from "./db/session-repo";

export {
  getUserById,
  getUserByUsername,
  getUserElo,
  getUserInfo,
  isAdmin,
  updateProfile,
  updateUserElo,
} from "./db/user-repo";

export {
  acceptFriendRequest,
  addFriend,
  blockUser,
  createFriendRequest,
  declineFriendRequest,
  getBlockedUsers,
  getFriends,
  getPendingFriendRequests,
  isUserBlocked,
  removeFriend,
  unblockUser,
} from "./db/social-repo";

export {
  createChallenge,
  getChatHistory,
  getChatsBetweenUsers,
  sendMessage,
} from "./db/chat-repo";

export {
  banUserFromReport,
  createBugReport,
  getBugReports,
  getUserReports,
  reportUser,
} from "./db/report-repo";

export {
  ACHIEVEMENT_META,
  awardAchievement,
  checkAndAwardAchievements,
  getUserAchievements,
  hasAchievement,
} from "./db/achievement-repo";

export type { MatchAchievementContext } from "./db/achievement-repo";

export {
  addTestCase,
  cancelMatch,
  completeMatch,
  createProblem,
  createMatchForUsers,
  createSubmission,
  findProblemForMatch,
  getDraft,
  getLeaderboard,
  getLeaderboardWithStats,
  getMatchById,
  getMatchHistory,
  getTestCases,
  getUserLeaderboardPosition,
  saveDraft,
  setMatchParticipantLanguage,
  updateMatchParticipantProgress,
  updateSubmission,
} from "./db/match-repo";

export type { LeaderboardEntry } from "./db/match-repo";

export {
  cancelPendingLobby,
  createPrivateMatch,
  getPrivateMatchLobbies,
  validatePrivateMatchJoin,
} from "./db/private-match-repo";

export {
  recordFocusSession,
  getFocusByDayOfWeek,
  getFocusByCategory,
} from "./db/focus-repo";

export {
  getLanguageWinLoss,
  getLanguageTestCasesPassed,
  getTopLanguages,
} from "./db/language-stats-repo";

export {
  createEvaluation,
  getStudentCodeHistory,
  getStudentEvaluations,
  getStudentPerformanceScore,
} from "./db/evaluation-repo";

export {
  getCategorySuccessRates,
  getHardProblemSolveTimeDistribution,
  getMedianElo,
} from "./db/stats-repo";

export {
  addTestCaseToSubmission,
  approveSubmission,
  getMySubmissions,
  getPendingSubmissions,
  getSubmissionForEdit,
  getTestCaseCount,
  rejectSubmission,
  sanitizeTestData,
  submitProblem,
  updateSubmission as updateProblemSubmission,
} from "./db/problem-submission-repo";
