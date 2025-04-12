-- 删除所有现有表
PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS "_PermissionToRole";
DROP TABLE IF EXISTS "_RoleToUser";
DROP TABLE IF EXISTS "Connection";
DROP TABLE IF EXISTS "IeltsAttempt";
DROP TABLE IF EXISTS "IeltsQuestion";
DROP TABLE IF EXISTS "IeltsReadingLog";
DROP TABLE IF EXISTS "IeltsResponse";
DROP TABLE IF EXISTS "IeltsStudyPlan";
DROP TABLE IF EXISTS "IeltsStudyTask";
DROP TABLE IF EXISTS "IeltsUserStats";
DROP TABLE IF EXISTS "IeltsUserVocabulary";
DROP TABLE IF EXISTS "IeltsPassage";
DROP TABLE IF EXISTS "NoteImage";
DROP TABLE IF EXISTS "Note";
DROP TABLE IF EXISTS "Passkey";
DROP TABLE IF EXISTS "Password";
DROP TABLE IF EXISTS "Permission";
DROP TABLE IF EXISTS "Role";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "UserImage";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "Verification";
DROP TABLE IF EXISTS "_prisma_migrations";

PRAGMA foreign_keys=ON;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Note_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "noteId" TEXT NOT NULL,
    CONSTRAINT "NoteImage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "UserImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Password" (
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Password_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expirationDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "digits" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "charSet" TEXT NOT NULL,
    "expiresAt" DATETIME
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "providerName" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aaguid" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publicKey" BLOB NOT NULL,
    "userId" TEXT NOT NULL,
    "webauthnUserId" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsPassage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "difficulty" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "source" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IeltsQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "passageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IeltsQuestion_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "IeltsPassage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "totalScore" REAL,
    "maxScore" INTEGER,
    "timeSpent" INTEGER,
    CONSTRAINT "IeltsAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IeltsAttempt_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "IeltsPassage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "timeTaken" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IeltsResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "IeltsQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IeltsResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "IeltsAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsUserVocabulary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT,
    "context" TEXT,
    "note" TEXT,
    "passageId" TEXT,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastReviewed" DATETIME,
    "nextReviewDate" DATETIME,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IeltsUserVocabulary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IeltsUserVocabulary_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "IeltsPassage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsReadingLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "progress" REAL,
    CONSTRAINT "IeltsReadingLog_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "IeltsPassage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IeltsReadingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsStudyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetScore" REAL NOT NULL,
    "weeklyGoal" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "targetDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IeltsStudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsStudyTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "passageId" TEXT,
    CONSTRAINT "IeltsStudyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "IeltsStudyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IeltsUserStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "readingTimeTotal" INTEGER NOT NULL DEFAULT 0,
    "passagesCompleted" INTEGER NOT NULL DEFAULT 0,
    "testsCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgAccuracy" REAL,
    "vocabLearned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IeltsUserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Note_ownerId_idx" ON "Note"("ownerId");

-- CreateIndex
CREATE INDEX "Note_ownerId_updatedAt_idx" ON "Note"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "NoteImage_noteId_idx" ON "NoteImage"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "UserImage_userId_key" ON "UserImage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Password_userId_key" ON "Password"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_target_type_key" ON "Verification"("target", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_providerName_providerId_key" ON "Connection"("providerName", "providerId");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- CreateIndex
CREATE INDEX "IeltsPassage_difficulty_idx" ON "IeltsPassage"("difficulty");

-- CreateIndex
CREATE INDEX "IeltsPassage_topic_idx" ON "IeltsPassage"("topic");

-- CreateIndex
CREATE INDEX "IeltsPassage_featured_idx" ON "IeltsPassage"("featured");

-- CreateIndex
CREATE INDEX "IeltsQuestion_passageId_idx" ON "IeltsQuestion"("passageId");

-- CreateIndex
CREATE INDEX "IeltsQuestion_type_idx" ON "IeltsQuestion"("type");

-- CreateIndex
CREATE INDEX "IeltsAttempt_userId_idx" ON "IeltsAttempt"("userId");

-- CreateIndex
CREATE INDEX "IeltsAttempt_passageId_idx" ON "IeltsAttempt"("passageId");

-- CreateIndex
CREATE INDEX "IeltsAttempt_userId_completedAt_idx" ON "IeltsAttempt"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsResponse_attemptId_questionId_key" ON "IeltsResponse"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "IeltsResponse_attemptId_idx" ON "IeltsResponse"("attemptId");

-- CreateIndex
CREATE INDEX "IeltsResponse_questionId_idx" ON "IeltsResponse"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsUserVocabulary_userId_word_key" ON "IeltsUserVocabulary"("userId", "word");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_idx" ON "IeltsUserVocabulary"("userId");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_word_idx" ON "IeltsUserVocabulary"("userId", "word");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_status_idx" ON "IeltsUserVocabulary"("userId", "status");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_nextReviewDate_idx" ON "IeltsUserVocabulary"("userId", "nextReviewDate");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_passageId_idx" ON "IeltsUserVocabulary"("passageId");

-- CreateIndex
CREATE INDEX "IeltsReadingLog_userId_idx" ON "IeltsReadingLog"("userId");

-- CreateIndex
CREATE INDEX "IeltsReadingLog_passageId_idx" ON "IeltsReadingLog"("passageId");

-- CreateIndex
CREATE INDEX "IeltsStudyPlan_userId_idx" ON "IeltsStudyPlan"("userId");

-- CreateIndex
CREATE INDEX "IeltsStudyTask_planId_idx" ON "IeltsStudyTask"("planId");

-- CreateIndex
CREATE INDEX "IeltsStudyTask_status_idx" ON "IeltsStudyTask"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsUserStats_userId_key" ON "IeltsUserStats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RoleToUser_AB_unique" ON "_RoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");
