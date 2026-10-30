import { requireStaff } from "@/lib/staff-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const { identity, response } = await requireStaff();
  return response ?? Response.json({ id: identity!.id }, { headers: { "Cache-Control": "no-store" } });
}
