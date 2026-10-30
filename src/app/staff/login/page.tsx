"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StaffLoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/staff/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) { router.replace("/"); router.refresh(); }
    else { setBusy(false); setError(result.error || "Unable to sign in."); }
  }
  return <main className="staff-login"><form onSubmit={submit} className="staff-login-card"><Link className="staff-brand" href="/">KEYFLOW<span>_</span></Link><p>STAFF ACCESS</p><h1>Sign in to continue</h1><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <div role="alert" className="staff-error">{error}</div>}<button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><small>Staff access is managed through AMPLIFY. Contact your administrator if you need access.</small></form></main>;
}
