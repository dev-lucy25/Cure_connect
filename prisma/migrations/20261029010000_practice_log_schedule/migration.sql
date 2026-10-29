-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "goalHours" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "PracticeLog" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "hospital" VARCHAR(60) NOT NULL,
    "ward" VARCHAR(60) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "activities" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSchedule" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "hospital" VARCHAR(60) NOT NULL,
    "ward" VARCHAR(60) NOT NULL,
    "startDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeLog_userId_date_id_idx" ON "PracticeLog"("userId", "date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "PracticeSchedule_userId_startDate_idx" ON "PracticeSchedule"("userId", "startDate");

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSchedule" ADD CONSTRAINT "PracticeSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 서버 검사를 우회해도 이상한 값이 들어가지 않도록 DB에서도 막는다.
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_minutes_check" CHECK ("minutes" BETWEEN 30 AND 1440 AND "minutes" % 30 = 0);
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_goalHours_check" CHECK ("goalHours" BETWEEN 100 AND 3000);

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "PracticeLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PracticeSchedule" ENABLE ROW LEVEL SECURITY;
