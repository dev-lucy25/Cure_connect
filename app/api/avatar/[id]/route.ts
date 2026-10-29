import { db } from "@/lib/db";
import { idSchema } from "@/lib/validation/form";

// 프로필 사진 보내기. id는 올릴 때마다 새로 생기므로 같은 주소의 내용은 바뀌지 않는다 → 브라우저·CDN에 오래 캐시한다.
// 주소에는 사용자 id가 없어서 사진만으로 계정을 알아낼 수 없다.
export async function GET(_req: Request, { params }: RouteContext<"/api/avatar/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return new Response(null, { status: 404 });
  const row = await db.profileAvatar.findUnique({ where: { id }, select: { data: true, contentType: true } });
  if (!row) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
