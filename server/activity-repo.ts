import "server-only";
import { db } from "@/lib/db";

// 내 정보 "크레딧 & 활동 요약" (데모 새 버전): 보유 크레딧 · 열람한 족보 · 올린 족보 · 제출한 케이스

export type ActivitySummary = { credits: number; unlocked: number; myNotes: number; submitted: number; graded: number };

export async function getActivitySummary(userId: string): Promise<ActivitySummary> {
  const [profile, unlocked, myNotes, submitted, graded] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } }),
    db.wardNoteUnlock.count({ where: { userId } }),
    db.wardNote.count({ where: { authorId: userId } }),
    db.caseSubmission.count({ where: { studentId: userId } }),
    db.caseSubmission.count({ where: { studentId: userId, status: "graded" } }),
  ]);
  return { credits: profile.credits, unlocked, myNotes, submitted, graded };
}
