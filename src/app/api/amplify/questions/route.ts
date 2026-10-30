import { getBankPage } from "@/lib/amplify-upstream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return getBankPage(new URL(request.url).searchParams.get("cursor"));
}
