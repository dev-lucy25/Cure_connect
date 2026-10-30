-- 프로필 사진(ProfileAvatar) · 족보 댓글(NoteComment, NoteCommentLike) · 댓글 닉네임(Profile.nickname)
-- 다른 테이블과 같이 RLS를 켜고 정책은 두지 않는다(Prisma 서버 접근만)

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "nickname" VARCHAR(12);

-- CreateTable
CREATE TABLE "ProfileAvatar" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" TEXT,
    "replyToId" TEXT,
    "body" VARCHAR(500) NOT NULL,
    "anonymous" BOOLEAN NOT NULL,
    "nickname" VARCHAR(12),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteCommentLike" (
    "userId" UUID NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteCommentLike_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileAvatar_userId_key" ON "ProfileAvatar"("userId");

-- CreateIndex
CREATE INDEX "NoteComment_noteId_parentId_createdAt_idx" ON "NoteComment"("noteId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteComment_parentId_createdAt_idx" ON "NoteComment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "NoteComment_userId_createdAt_idx" ON "NoteComment"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "NoteCommentLike_commentId_idx" ON "NoteCommentLike"("commentId");

-- AddForeignKey
ALTER TABLE "ProfileAvatar" ADD CONSTRAINT "ProfileAvatar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "WardNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NoteComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteCommentLike" ADD CONSTRAINT "NoteCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteCommentLike" ADD CONSTRAINT "NoteCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "NoteComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- 값 범위
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_body_check" CHECK (length(btrim("body")) > 0);
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_counts_check" CHECK ("likeCount" >= 0 AND "replyCount" >= 0);
-- 익명이 아니면 닉네임이 있어야 한다
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_name_check" CHECK ("anonymous" OR "nickname" IS NOT NULL);
-- 프로필 사진은 1MB 이하 이미지만
ALTER TABLE "ProfileAvatar" ADD CONSTRAINT "ProfileAvatar_size_check" CHECK (octet_length("data") BETWEEN 1 AND 1048576);
ALTER TABLE "ProfileAvatar" ADD CONSTRAINT "ProfileAvatar_type_check" CHECK ("contentType" IN ('image/webp', 'image/png', 'image/jpeg'));

-- RLS (Supabase Data API로 직접 접근 차단)
ALTER TABLE "ProfileAvatar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NoteComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NoteCommentLike" ENABLE ROW LEVEL SECURITY;
