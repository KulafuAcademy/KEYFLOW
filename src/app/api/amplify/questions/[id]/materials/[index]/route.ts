import { UUID } from "@/lib/amplify";
import { fetchUpstream, noStore } from "@/lib/amplify-upstream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  if (!UUID.test(id) || !/^\d{1,2}$/.test(index))
    return new Response("Invalid material.", { status: 400, headers: noStore });
  try {
    const r = await fetchUpstream(
      `/api/writing-questions/${id}/materials/${index}`,
    );
    if (!r.ok)
      return new Response("Material is unavailable or no longer published.", {
        status: r.status === 404 ? 404 : 503,
        headers: noStore,
      });
    const mime = (r.headers.get("content-type") || "").split(";")[0];
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "application/pdf",
      ].includes(mime)
    )
      throw Error("Unsupported material");
    const bytes = await r.arrayBuffer();
    if (bytes.byteLength > 15 * 1024 * 1024) throw Error("Material too large");
    return new Response(bytes, {
      headers: {
        ...noStore,
        "Content-Type": mime,
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Supporting material is currently unavailable.", {
      status: 503,
      headers: noStore,
    });
  }
}
