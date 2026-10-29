-- 흐름 수정 + 익명 통계 준비 (2026-10-30)
-- 1) 체크리스트 기본 항목은 한 번만 (F10)  2) 방 코드로만 연결된 학생도 제출 (F4)  3) 채점 점수  4) 일지 난이도·술기·병동 분류 (P10)

-- CreateEnum
CREATE TYPE "WardCategory" AS ENUM ('internal', 'surgical', 'icu', 'er', 'pediatric', 'obstetric', 'psychiatric', 'community', 'operating', 'other');

-- DropForeignKey
ALTER TABLE "CaseSubmission" DROP CONSTRAINT "CaseSubmission_orgId_fkey";

-- AlterTable
ALTER TABLE "CaseSubmission" ADD COLUMN     "score" INTEGER,
ALTER COLUMN "orgId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PracticeLog" ADD COLUMN     "difficulty" INTEGER,
ADD COLUMN     "hardSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "wardCategory" "WardCategory";

-- AlterTable
ALTER TABLE "PracticeSchedule" ADD COLUMN     "wardCategory" "WardCategory";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "checklistSeeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statsOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "CaseSubmission" ADD CONSTRAINT "CaseSubmission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 값 범위 (앱 검사와 같게)
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_difficulty_check" CHECK ("difficulty" IS NULL OR "difficulty" BETWEEN 1 AND 5);
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_hardSkills_check" CHECK (cardinality("hardSkills") <= 12);
ALTER TABLE "CaseSubmission" ADD CONSTRAINT "CaseSubmission_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);

-- 이미 체크리스트가 있는 사용자는 기본 항목을 받은 것으로 본다
UPDATE "Profile" p SET "checklistSeeded" = true WHERE EXISTS (SELECT 1 FROM "ChecklistItem" c WHERE c."userId" = p."id");
