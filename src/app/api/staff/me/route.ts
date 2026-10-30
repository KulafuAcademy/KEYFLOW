import { requireStaff } from "@/lib/staff-auth";
import { publicLearningAccessEnabled } from "@/lib/public-learning-access";
export const dynamic = "force-dynamic";
export async function GET() {
  const { identity, response } = await requireStaff();
  return response ?? Response.json(publicLearningAccessEnabled() ? { id: "public", publicAccess: true } : { id: identity!.id }, { headers: { "Cache-Control": "no-store" } });
}
