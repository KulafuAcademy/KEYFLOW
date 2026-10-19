import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "KEYFLOW — IELTS Typing Studio",
  icons: { icon: "/icon.svg" },
  description:
    "Build typing speed, precision, and writing fluency for computer-delivered IELTS Academic. Private, browser-local practice.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
