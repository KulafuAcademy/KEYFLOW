import {previewOrigin} from './hub-runtime';
import { getVercelOidcToken } from "@vercel/oidc";

export const AMPLIFY_ORIGIN = "https://amplify.aica.academy";
type ProtectionOptions = {
  onVercel?: boolean;
  environment?: Record<string,string|undefined>;
  readOidcToken?: () => string | Promise<string>;
};

/** Preview clients must never forward their identity to Production by accident. */
export function approvedAmplifyOrigin(origin:string,env:Record<string,string|undefined>=process.env){
 if(env.HUB_SSO_MODE==='preview'){
  if(env.VERCEL_ENV!=='preview')return false;
  try{return origin===previewOrigin(env.HUB_AMPLIFY_ORIGIN);}catch{return false;}
 }
 return origin===AMPLIFY_ORIGIN;
}

/** Server-to-server identity only. Never forward the browser's Vercel cookie. */
export async function upstreamHeaders(
  origin: string,
  staffAccessToken?: string | null,
  {
    onVercel = process.env.VERCEL === "1",
    environment = process.env,
    readOidcToken = getVercelOidcToken,
  }: ProtectionOptions = {},
): Promise<Headers> {
  const headers = new Headers({ Accept: "application/json" });
  if (onVercel) {
    // Avoid leaking a project credential to an accidental origin override.
    if (!approvedAmplifyOrigin(origin,environment)) throw Error("Unexpected protected upstream");
    const token = await readOidcToken();
    if (!token) throw Error("Protected upstream identity is unavailable");
    headers.set("x-vercel-trusted-oidc-idp-token", token);
  }
  if (staffAccessToken)
    headers.set("Authorization", `Bearer ${staffAccessToken}`);
  return headers;
}

/** Keep this gateway limited to the existing read-only Writing bank. */
export function writingBankPath(path: string) {
  const [pathname, query, extra] = path.split("?");
  if (
    extra !== undefined ||
    !/^\/api\/writing-questions(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/materials\/\d{1,2})?)?$/i.test(
      pathname,
    )
  )
    throw Error("Invalid Writing bank path");
  if (query !== undefined) {
    const params = [...new URLSearchParams(query)];
    if (
      pathname !== "/api/writing-questions" ||
      params.length !== 1 ||
      params[0][0] !== "cursor" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        params[0][1],
      )
    )
      throw Error("Invalid Writing bank query");
  }
  return path;
}
