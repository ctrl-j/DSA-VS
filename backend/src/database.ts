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
  addTestCase,
  completeMatch,
  createMatchForUsers,
  createProblem,
  createSubmission,
  findProblemForMatch,
  getDraft,
  getLeaderboard,
  getMatchById,
  getMatchHistory,
  getTestCases,
  saveDraft,
  setMatchParticipantLanguage,
  updateMatchParticipantProgress,
  updateSubmission,
} from "./db/match-repo";
