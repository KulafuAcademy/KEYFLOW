import { getBankQuestion } from "@/lib/amplify-upstream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return getBankQuestion((await params).id);
}
