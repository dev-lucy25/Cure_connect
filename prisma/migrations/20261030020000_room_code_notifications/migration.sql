-- AlterTable
ALTER TABLE "PracticeSchedule" ADD COLUMN     "prepNotes" VARCHAR(300) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "roomCode" VARCHAR(20);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "kind" VARCHAR(30) NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "link" VARCHAR(200),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Profile_roomCode_idx" ON "Profile"("roomCode");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 방 코드는 영문 대문자·숫자·하이픈, 교수끼리는 겹치지 않는다(학생은 같은 방에 여럿)
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_roomCode_check" CHECK ("roomCode" IS NULL OR "roomCode" ~ '^[A-Z0-9-]{3,20}$');
CREATE UNIQUE INDEX "Profile_professor_roomCode_key" ON "Profile"("roomCode") WHERE "role" = 'professor';

-- 공개 API(anon 키)로 직접 읽고 쓰지 못하게 RLS를 켜고 정책은 두지 않는다. 앱은 Prisma로만 접근한다.
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
