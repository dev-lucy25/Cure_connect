-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('adult', 'maternal', 'child', 'community', 'psych', 'management');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('day', 'evening', 'night');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "PracticeLog" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" UUID,
ADD COLUMN     "shift" "Shift",
ADD COLUMN     "status" "LogStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "subject" "Subject" NOT NULL DEFAULT 'adult';

-- AlterTable
ALTER TABLE "PracticeSchedule" ADD COLUMN     "commonDiseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "department" VARCHAR(30),
ADD COLUMN     "endDate" DATE,
ADD COLUMN     "groupName" VARCHAR(20),
ADD COLUMN     "meetingPlace" VARCHAR(80),
ADD COLUMN     "meetingTime" VARCHAR(5),
ADD COLUMN     "preceptor" VARCHAR(40),
ADD COLUMN     "shift" "Shift",
ADD COLUMN     "shiftEnd" VARCHAR(5),
ADD COLUMN     "shiftStart" VARCHAR(5),
ADD COLUMN     "subject" "Subject",
ADD COLUMN     "teammates" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "text" VARCHAR(100) NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItem_userId_sortOrder_idx" ON "ChecklistItem"("userId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 종료일은 시작일보다 앞설 수 없다
ALTER TABLE "PracticeSchedule" ADD CONSTRAINT "PracticeSchedule_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "ChecklistItem" ENABLE ROW LEVEL SECURITY;
