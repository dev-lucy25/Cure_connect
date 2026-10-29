"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import IconButton from "@/components/ui/icon-button";
import { IconPencil, IconTrash } from "@/components/ui/icons";

// 목록 한 줄의 고치기·지우기. 지우기는 한 번 더 확인한다.
export default function RowActions({
  id,
  onEdit,
  deleteAction,
  deleting,
}: {
  id: string;
  onEdit: () => void;
  deleteAction: (formData: FormData) => void;
  deleting: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form action={deleteAction} className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <span className="text-body-sm font-bold text-danger">정말 지울까요?</span>
        <Button type="submit" variant="ghost" disabled={deleting} className="px-3 text-body-sm text-danger">
          {deleting ? "지우는 중..." : "지우기"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)} className="px-3 text-body-sm">
          취소
        </Button>
      </form>
    );
  }
  return (
    <div className="flex items-center">
      <IconButton label="고치기" onClick={onEdit}>
        <IconPencil size={18} />
      </IconButton>
      <IconButton label="지우기" tone="danger" onClick={() => setConfirming(true)}>
        <IconTrash size={18} />
      </IconButton>
    </div>
  );
}
