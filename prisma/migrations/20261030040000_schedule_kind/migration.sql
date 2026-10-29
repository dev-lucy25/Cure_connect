-- 학사 일정 D-Day (케이스 발표·술기 시험 등): 일정 종류 추가. 기존 일정은 모두 실습

-- CreateEnum
CREATE TYPE "ScheduleKind" AS ENUM ('practice', 'academic');

-- AlterTable
ALTER TABLE "PracticeSchedule" ADD COLUMN "kind" "ScheduleKind" NOT NULL DEFAULT 'practice';
