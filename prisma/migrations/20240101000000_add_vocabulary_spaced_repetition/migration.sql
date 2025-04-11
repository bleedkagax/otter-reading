-- AlterTable
ALTER TABLE "IeltsUserVocabulary" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "IeltsUserVocabulary" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "IeltsUserVocabulary" ADD COLUMN "nextReviewDate" DATETIME;

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_status_idx" ON "IeltsUserVocabulary"("userId", "status");

-- CreateIndex
CREATE INDEX "IeltsUserVocabulary_userId_nextReviewDate_idx" ON "IeltsUserVocabulary"("userId", "nextReviewDate");
