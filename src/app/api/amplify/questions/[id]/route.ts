import { getBankQuestion } from "@/lib/amplify-upstream";
import { requireStaff } from "@/lib/staff-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { accessToken, response } = await requireStaff();
  if (response) return response;
  return getBankQuestion((await params).id, fetch, accessToken);
}
