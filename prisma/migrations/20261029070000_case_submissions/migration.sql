-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('submitted', 'graded', 'revision');

-- CreateTable
CREATE TABLE "CaseSubmission" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "studentId" UUID NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "ward" VARCHAR(60) NOT NULL,
    "memo" VARCHAR(2000) NOT NULL,
    "aiResult" JSONB NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'submitted',
    "grade" VARCHAR(10),
    "feedback" VARCHAR(2000),
    "gradedBy" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "CaseSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseSubmission_orgId_status_submittedAt_idx" ON "CaseSubmission"("orgId", "status", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "CaseSubmission_studentId_submittedAt_idx" ON "CaseSubmission"("studentId", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "CaseSubmission_caseId_submittedAt_idx" ON "CaseSubmission"("caseId", "submittedAt" DESC);

-- AddForeignKey
ALTER TABLE "CaseSubmission" ADD CONSTRAINT "CaseSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseSubmission" ADD CONSTRAINT "CaseSubmission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseSubmission" ADD CONSTRAINT "CaseSubmission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- 같은 케이스는 채점 대기(submitted) 제출이 하나만 있을 수 있다 (연타·동시 제출에도 중복 없음)
CREATE UNIQUE INDEX "CaseSubmission_one_pending_per_case" ON "CaseSubmission"("caseId") WHERE "status" = 'submitted';

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "CaseSubmission" ENABLE ROW LEVEL SECURITY;
