-- CreateTable to recreate the table with all fields
CREATE TABLE "IeltsUserVocabulary_new" (
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
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReviewed" DATETIME,
  "nextReviewDate" DATETIME,
  "reviewCount" INTEGER NOT NULL DEFAULT 0
);

-- Copy data from old table to new table
INSERT INTO "IeltsUserVocabulary_new" (
  "id", "userId", "word", "translation", "context", "note", 
  "passageId", "mastered", "createdAt", "lastReviewed", "reviewCount"
) 
SELECT 
  "id", "userId", "word", "translation", "context", "note", 
  "passageId", "mastered", "createdAt", "lastReviewed", "reviewCount"
FROM "IeltsUserVocabulary";

-- Drop old table
DROP TABLE "IeltsUserVocabulary";

-- Rename new table to old table name
ALTER TABLE "IeltsUserVocabulary_new" RENAME TO "IeltsUserVocabulary";

-- Create indexes
CREATE UNIQUE INDEX "IeltsUserVocabulary_userId_word_key" ON "IeltsUserVocabulary"("userId", "word");
CREATE INDEX "IeltsUserVocabulary_userId_idx" ON "IeltsUserVocabulary"("userId");
CREATE INDEX "IeltsUserVocabulary_userId_word_idx" ON "IeltsUserVocabulary"("userId", "word");
CREATE INDEX "IeltsUserVocabulary_userId_status_idx" ON "IeltsUserVocabulary"("userId", "status");
CREATE INDEX "IeltsUserVocabulary_userId_nextReviewDate_idx" ON "IeltsUserVocabulary"("userId", "nextReviewDate");
