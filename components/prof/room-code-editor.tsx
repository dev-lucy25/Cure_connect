"use client";

import { useActionState, useState } from "react";
import { setRoomCodeAction } from "@/server/professor-actions";
import type { FormState } from "@/lib/validation/form";
import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import FormStatus from "@/components/ui/form-status";
import Collapse from "@/components/motion/collapse";
import { IconKey } from "@/components/ui/icons";

// 내 실습반 방 코드: 학생에게 알려 줄 코드를 보여 주고, 바꿀 수 있다(다른 교수와 겹치면 안 됨)
export default function RoomCodeEditor({
  roomCode,
}: {
  roomCode: string | null;
}) {
  const [state, action, pending] = useActionState<
    FormState<"roomCode">,
    FormData
  >(setRoomCodeAction, {});
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  // 연 뒤에 저장이 성공하면 닫힌 상태로 본다
  const open =
    openedAt !== null && !(state.savedAt && state.savedAt > openedAt);

  return (
    <div className="w-full rounded-control bg-subtle p-3 md:w-80">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption font-bold text-ink-soft">
            <IconKey size={14} className="mr-1 inline align-[-0.2em]" />
            실습반 방 코드
          </p>
          <p
            className="font-display text-title leading-tight text-ink"
            data-room-code
          >
            {roomCode ?? "아직 없어요"}
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpenedAt(Date.now())}
            className="min-h-11 shrink-0 whitespace-nowrap text-body-sm font-bold text-brand-deep hover:underline"
          >
            {roomCode ? "바꾸기" : "만들기"}
          </button>
        )}
      </div>
      {!open && (
        <FormStatus savedAt={state.savedAt} savedText="방 코드를 바꿨어요" />
      )}
      <Collapse open={open}>
        <form action={action} noValidate className="mt-3 space-y-3">
          <Field
            name="roomCode"
            label="새 방 코드 (영문·숫자·하이픈 3~20자)"
            placeholder="예: DIT-2026"
            autoCapitalize="characters"
            autoComplete="off"
            defaultValue={state.values?.roomCode ?? roomCode ?? ""}
            error={state.fieldErrors?.roomCode}
          />
          <p className="text-caption text-ink-soft">
            바꾸면 예전 코드로 들어온 학생은 학교가 같을 때만 보여요.
          </p>
          <FormStatus message={state.message} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenedAt(null)}
            >
              취소
            </Button>
          </div>
        </form>
      </Collapse>
    </div>
  );
}
