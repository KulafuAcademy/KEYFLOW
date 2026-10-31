import type { Metadata } from "next";
import TypingHunter from "@/components/typing-hunter";

export const metadata: Metadata = {
  title: "Typing Hunter — KEYFLOW",
  description: "A keyboard-first monster battle typing game.",
  robots: { index: false, follow: false },
};

export default function TypingHunterPage() {
  return (
    <main className="hunter-standalone-page">
      <header className="hunter-standalone-header">
        <span className="hunter-standalone-brand">KEYFLOW_</span>
        <span>STANDALONE COMBAT PREVIEW</span>
      </header>
      <div className="hunter-standalone-content">
        <div className="hunter-standalone-intro">
          <p className="eyebrow">
            <span className="square" /> ASHFALL RIDGE / TYPE TO STRIKE
          </p>
          <h1>
            Typing Hunter<span className="heading-dot">.</span>
          </h1>
          <p>
            Read the monster. Strike with your fingers. Survive the
            counterattack.
          </p>
        </div>
        <TypingHunter />
      </div>
    </main>
  );
}
