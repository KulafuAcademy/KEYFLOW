import { getBankPage } from "@/lib/amplify-upstream";
import { requireStaff } from "@/lib/staff-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { accessToken, response } = await requireStaff();
  if (response) return response;
  return getBankPage(new URL(request.url).searchParams.get("cursor"), fetch, accessToken);
}
