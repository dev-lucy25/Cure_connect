"use client";

import { useActionState, useRef, useState, startTransition, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { removeAvatar, uploadAvatar, type AvatarState } from "@/server/avatar-actions";
import { AVATAR_MAX_BYTES, AVATAR_PX, AVATAR_SOURCE_MAX_BYTES } from "@/lib/avatar";
import { SPRING_SOFT } from "@/lib/motion";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import FormStatus from "@/components/ui/form-status";
import Modal from "@/components/ui/modal";
import { IconCamera, IconZoomIn, IconZoomOut } from "@/components/ui/icons";

// 내 정보의 프로필 사진: 사진 고르기 → 동그란 틀 안에서 끌어 옮기고 확대 → 정사각형 WebP로 줄여 올리기.
// 사진이 없으면 기본 거북이. 원본은 서버로 보내지 않고 브라우저에서 잘라 작은 이미지만 보낸다.

const FRAME = 264;
const MAX_ZOOM = 3;

// 크기는 따로 들고 있는다: 닫히는 애니메이션 동안에도 자르기 틀이 그려지는데, 그때 이미 비트맵을 놓아 버리면 크기가 0이 된다
type Picked = { url: string; bitmap: ImageBitmap; width: number; height: number };

export default function AvatarEditor({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [up, upAction, uploading] = useActionState<AvatarState, FormData>(uploadAvatar, {});
  const [rm, rmAction, removing] = useActionState<AvatarState>(removeAvatar, {});
  const [picked, setPicked] = useState<Picked | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 올리는 동안 잘라 둔 사진을 먼저 보여 준다
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = uploading || removing;
  const shown = uploading && preview ? preview : avatarUrl;
  const last = (up.savedAt ?? 0) > (rm.savedAt ?? 0) ? up : rm;

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("사진 파일만 고를 수 있어요");
    if (file.size > AVATAR_SOURCE_MAX_BYTES) return setError("15MB 이하 사진을 골라 주세요");
    try {
      const bitmap = await createImageBitmap(file);
      setPicked({ url: URL.createObjectURL(file), bitmap, width: bitmap.width, height: bitmap.height });
    } catch {
      setError("이 사진은 열 수 없어요. JPG나 PNG로 다시 골라 주세요");
    }
  }

  function close() {
    // 닫히는 애니메이션이 끝난 뒤에 원본을 놓는다
    const done = picked;
    if (done) setTimeout(() => (URL.revokeObjectURL(done.url), done.bitmap.close()), 600);
    setPicked(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save(blob: Blob) {
    const fd = new FormData();
    fd.set("avatar", blob, "avatar.webp");
    setPreview(URL.createObjectURL(blob));
    close();
    startTransition(() => upAction(fd));
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={shown ?? "turtle"}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={SPRING_SOFT}
          >
            <Avatar src={shown} size={88} alt={`${name} 프로필 사진`} className={busy ? "opacity-60" : ""} />
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="프로필 사진 바꾸기"
          className="press absolute -right-1 -bottom-1 grid size-9 cursor-pointer place-items-center rounded-full border-2 border-surface bg-brand-deep text-on-inverse shadow-soft disabled:cursor-not-allowed"
        >
          <IconCamera size={18} />
        </button>
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="text-body-sm font-bold text-ink">프로필 사진</p>
        <p className="text-caption text-ink-soft">{avatarUrl ? "족보 댓글을 닉네임으로 쓸 때 함께 보여요" : "지금은 기본 거북이예요"}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" className="min-h-9 px-3 text-caption" disabled={busy} onClick={() => fileRef.current?.click()}>
            {uploading ? "올리는 중..." : "사진 바꾸기"}
          </Button>
          {avatarUrl && (
            <Button type="button" variant="ghost" className="min-h-9 px-3 text-caption" disabled={busy} onClick={() => startTransition(() => rmAction())}>
              {removing ? "되돌리는 중..." : "기본 거북이로"}
            </Button>
          )}
        </div>
        {error && <p className="animate-field-in text-caption font-medium text-danger">{error}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0])} />
      <FormStatus message={last.message} />
      <FormStatus savedAt={last.savedAt} savedText={last.notice} />

      <Modal open={picked !== null} onClose={close} title="사진 자르기" description="끌어서 위치를 옮기고, 아래 막대로 크기를 맞춰요">
        {picked && <Cropper picked={picked} onCancel={close} onSave={save} />}
      </Modal>
    </div>
  );
}

function Cropper({ picked, onCancel, onSave }: { picked: Picked; onCancel: () => void; onSave: (blob: Blob) => void }) {
  const { bitmap, width: bw, height: bh } = picked;
  // 짧은 변이 틀을 꽉 채우는 크기가 1배
  const base = FRAME / Math.min(bw, bh);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const w = bw * base * zoom;
  const h = bh * base * zoom;

  // 사진이 틀 밖으로 비지 않게 옮길 수 있는 범위를 묶는다
  const clamp = (x: number, y: number, z = zoom) => {
    const mx = (bw * base * z - FRAME) / 2;
    const my = (bh * base * z - FRAME) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };
  const setZoomClamped = (z: number) => {
    const next = Math.max(1, Math.min(MAX_ZOOM, z));
    setZoom(next);
    setPos((p) => clamp(p.x, p.y, next));
  };

  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setPos(clamp(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y));
  }
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      setPos((p) => clamp(p.x + moves[e.key][0], p.y + moves[e.key][1]));
    } else if (e.key === "+" || e.key === "=") setZoomClamped(zoom + 0.1);
    else if (e.key === "-") setZoomClamped(zoom - 0.1);
  }

  async function save() {
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_PX;
    const ctx = canvas.getContext("2d")!;
    const k = AVATAR_PX / FRAME;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, AVATAR_PX, AVATAR_PX);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, (FRAME / 2 + pos.x - w / 2) * k, (FRAME / 2 + pos.y - h / 2) * k, w * k, h * k);
    const encode = (q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", q));
    let blob = await encode(0.86);
    if (blob && blob.size > AVATAR_MAX_BYTES) blob = await encode(0.6);
    setSaving(false);
    if (blob) onSave(blob);
  }

  return (
    <div className="space-y-5">
      <div
        role="application"
        aria-label="사진 위치 조절 (화살표로 옮기고 +, -로 확대·축소)"
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKey}
        onWheel={(e) => setZoomClamped(zoom - e.deltaY * 0.0015)}
        className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-card bg-ink/90 outline-none select-none focus-visible:ring-3 focus-visible:ring-brand-deep active:cursor-grabbing"
        style={{ width: FRAME, height: FRAME }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 고른 로컬 사진(blob:) 미리보기 */}
        <img
          src={picked.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none"
          style={{ width: w, height: h, left: FRAME / 2 + pos.x - w / 2, top: FRAME / 2 + pos.y - h / 2 }}
        />
        {/* 동그란 틀 바깥은 어둡게 */}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(0_0_0/0.5)] ring-2 ring-white/80" />
      </div>

      <div className="flex items-center gap-3 px-1">
        <button type="button" aria-label="축소" onClick={() => setZoomClamped(zoom - 0.2)} className="press grid size-9 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-ink">
          <IconZoomOut size={20} />
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoomClamped(Number(e.target.value))}
          aria-label="확대"
          className="h-1.5 flex-1 cursor-pointer accent-brand-deep"
        />
        <button type="button" aria-label="확대" onClick={() => setZoomClamped(zoom + 0.2)} className="press grid size-9 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-subtle hover:text-ink">
          <IconZoomIn size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "자르는 중..." : "이 사진으로 하기"}
        </Button>
      </div>
    </div>
  );
}
