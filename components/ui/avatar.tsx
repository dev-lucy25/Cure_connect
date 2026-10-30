import Image from "next/image";
import NurseTurtle from "@/components/mascot/nurse-turtle";

// 공용 프로필 사진: 사진이 있으면 동그랗게, 없으면 민트 동그라미 안의 간호 캡 거북이(기본 사진).
// 사진은 올릴 때 이미 작게 줄였으므로 이미지 최적화를 거치지 않는다.
export default function Avatar({
  src,
  size = 40,
  alt = "",
  className = "",
  muted = false,
}: {
  src: string | null;
  size?: number;
  /** 옆에 이름이 있으면 빈 값(장식)으로 둔다 */
  alt?: string;
  className?: string;
  /** 익명: 회색 바탕의 흐린 거북이 */
  muted?: boolean;
}) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-line/80 ${muted ? "bg-subtle" : "bg-brand-soft"} ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} unoptimized className="size-full object-cover" />
      ) : (
        <NurseTurtle size={Math.round(size * 1.08)} still decorative className={`translate-y-[6%] ${muted ? "opacity-60 grayscale" : ""}`} />
      )}
    </span>
  );
}
