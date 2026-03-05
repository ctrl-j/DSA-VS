import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// 1. Define the mock instance
const prismaMock = mockDeep<PrismaClient>();

// 2. Mock the @prisma/client module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => prismaMock),
}));

// 3. Import the database module AFTER the mock is defined
import * as db from './database';
import bcrypt from 'bcrypt';

describe('Exhaustive Database Requirements Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('Registration & Account', () => {
    it('should register a user successfully (Requirement: Create account/set username)', async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue(null);
      const userData = { id: '1', username: 'newuser', passwordHash: 'hashed', elo: 1200 };
      (prismaMock.user.create as any).mockResolvedValue(userData);

      const result = await db.registerUser('newuser', 'pass123');
      expect(result.username).toBe('newuser');
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should fail when username already exists (Requirement: Duplicate usernames)', async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: 'existing' });
      
      await expect(db.registerUser('existing', 'pass123')).rejects.toThrow('USERNAME_ALREADY_EXISTS');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials (Requirement: Login)', async () => {
      const hash = await bcrypt.hash('correct', 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: '1', passwordHash: hash });

      const result = await db.checkUserPassword('user', 'correct');
      expect(result).toBe('1');
    });

    it('should fail login with invalid password (Requirement: Invalid password)', async () => {
      const hash = await bcrypt.hash('correct', 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: '1', passwordHash: hash });

      const result = await db.checkUserPassword('user', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('Password Management', () => {
    it('should fail to change password with wrong old password (Requirement: Wrong old password)', async () => {
      const oldHash = await bcrypt.hash('old_pass', 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: '1', passwordHash: oldHash });

      await expect(db.changeUserPassword('1', 'wrong_old', 'new_pass')).rejects.toThrow('INVALID_OLD_PASSWORD');
    });

    it('should change password with correct old password (Requirement: Correct new password)', async () => {
      const oldHash = await bcrypt.hash('old_pass', 1);
      (prismaMock.user.findUnique as any).mockResolvedValue({ id: '1', passwordHash: oldHash });
      (prismaMock.user.update as any).mockResolvedValue({ id: '1' });

      await db.changeUserPassword('1', 'old_pass', 'new_pass');
      expect(prismaMock.user.update).toHaveBeenCalled();
    });
  });

  describe('Profile Customization', () => {
    it('should update profile fields (Requirement: Customize profile)', async () => {
      (prismaMock.profile.upsert as any).mockResolvedValue({ userId: '1', bio: 'New Bio' });
      const result = await db.updateProfile('1', { bio: 'New Bio' });
      expect(result.bio).toBe('New Bio');
    });
  });

  describe('Friend Management', () => {
    it('should create friend request/acceptance (Requirement: Friend users & acceptance)', async () => {
      // First addFriend call (creates and accepts in our simplified logic)
      (prismaMock.friendRequest.findUnique as any).mockResolvedValue(null);
      (prismaMock.friendRequest.create as any).mockResolvedValue({ id: 'req1', status: 'ACCEPTED' });

      const result = await db.addFriend('u1', 'u2');
      expect(result.status).toBe('ACCEPTED');
    });

    it('should update request to accepted (Requirement: Acceptance flow)', async () => {
      // Manually accepting an existing request
      (prismaMock.friendRequest.update as any).mockResolvedValue({ id: 'req1', status: 'ACCEPTED' });
      const result = await db.acceptFriendRequest('req1');
      expect(result.status).toBe('ACCEPTED');
    });
  });

  describe('Blocking & Safety', () => {
    it('should block a user (Requirement: Block users)', async () => {
      (prismaMock.block.create as any).mockResolvedValue({ blockerId: 'u1', blockedId: 'u2' });
      await db.blockUser('u1', 'u2');
      expect(prismaMock.block.create).toHaveBeenCalled();
    });

    it('should prevent blocked user from messaging (Requirement: Blocked user can’t message)', async () => {
      (prismaMock.block.findUnique as any).mockResolvedValue({ blockerId: 'receiver', blockedId: 'sender' });
      await expect(db.sendMessage('sender', 'receiver', 'hi')).rejects.toThrow('CANNOT_SEND_MESSAGE_BLOCKED');
    });

    it('should prevent blocked user from challenging (Requirement: Blocked user can’t challenge)', async () => {
      (prismaMock.block.findUnique as any).mockResolvedValue({ blockerId: 'receiver', blockedId: 'sender' });
      await expect(db.createChallenge('sender', 'receiver')).rejects.toThrow('CANNOT_CHALLENGE_BLOCKED');
    });
  });

  describe('Messaging & Challenges', () => {
    it('should send and fetch messages (Requirement: Message other users)', async () => {
      (prismaMock.block.findUnique as any).mockResolvedValue(null);
      (prismaMock.message.create as any).mockResolvedValue({ content: 'hello' });
      (prismaMock.message.findMany as any).mockResolvedValue([{ content: 'hello' }]);

      await db.sendMessage('u1', 'u2', 'hello');
      const history = await db.getChatHistory('u1', 'u2');
      expect(history[0].content).toBe('hello');
    });

    it('should create challenges (Requirement: Challenge a specific user)', async () => {
      (prismaMock.block.findUnique as any).mockResolvedValue(null);
      (prismaMock.message.create as any).mockResolvedValue({ content: 'CHALLENGE_INVITE' });

      const result = await db.createChallenge('u1', 'u2');
      expect(result.content).toBe('CHALLENGE_INVITE');
    });
  });

  describe('Elo & Admin', () => {
    it('should return correct Elo for user (Requirement: See current Elo)', async () => {
      (prismaMock.user.findUnique as any).mockResolvedValue({ elo: 1500 });
      const elo = await db.getUserElo('1');
      expect(elo).toBe(1500);
    });

    it('should allow admin to monitor chats (Requirement: Admin monitor chats)', async () => {
      (prismaMock.message.findMany as any).mockResolvedValue([{ content: 'monitored' }]);
      const chats = await db.getChatsBetweenUsers('u1', 'u2');
      expect(chats[0].content).toBe('monitored');
    });
  });

  describe('Reporting & Bugs', () => {
    it('should log user reports (Requirement: Report system)', async () => {
      (prismaMock.report.create as any).mockResolvedValue({ id: 'r1' });
      await db.reportUser('u1', 'u2', 'toxic');
      expect(prismaMock.report.create).toHaveBeenCalled();
    });

    it('should log bug reports (Requirement: Report issues/bugs)', async () => {
      (prismaMock.bugReport.create as any).mockResolvedValue({ id: 'b1' });
      await db.createBugReport('u1', 'Bug', 'Details');
      expect(prismaMock.bugReport.create).toHaveBeenCalled();
    });
  });
});
