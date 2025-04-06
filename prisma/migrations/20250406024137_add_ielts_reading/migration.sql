-- CreateTable
CREATE TABLE "IeltsPassage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "source" TEXT,
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
    CONSTRAINT "IeltsResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "IeltsAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IeltsResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "IeltsQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewed" DATETIME,
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
    CONSTRAINT "IeltsReadingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IeltsReadingLog_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "IeltsPassage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
CREATE INDEX "IeltsResponse_attemptId_idx" ON "IeltsResponse"("attemptId");

-- CreateIndex
CREATE INDEX "IeltsResponse_questionId_idx" ON "IeltsResponse"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsResponse_attemptId_questionId_key" ON "IeltsResponse"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_idx" ON "IeltsUserVocabulary"("userId");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_word_idx" ON "IeltsUserVocabulary"("userId", "word");

-- CreateIndex
CREATE UNIQUE INDEX "IeltsUserVocabulary_userId_word_key" ON "IeltsUserVocabulary"("userId", "word");

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
