import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QuestionVisual from "../src/components/question-visual";
import { prompts } from "../src/lib/content";
import {
  questionsInCategory,
  randomVisualQuestion,
  visualCategories,
  visualQuestions,
  type QuestionVisual as Visual,
} from "../src/lib/task1-visuals";
import { elapsedMs } from "../src/lib/metrics";
import { KEYS, read, write, validDrafts } from "../src/lib/storage";

test("21 original visual questions: exactly three per supported type and unique draft IDs", () => {
  assert.equal(visualQuestions.length, 21);
  for (const c of visualCategories)
    assert.equal(questionsInCategory(c.id).length, 3, c.id);
  assert.equal(
    new Set([...prompts, ...visualQuestions].map((q) => q.id)).size,
    prompts.length + 21,
  );
  assert.ok(
    visualQuestions.every(
      (q) =>
        q.task === 1 &&
        q.question.includes("Summarise the information") &&
        q.note &&
        q.visual.kind === q.category,
    ),
  );
});
test("Basic questions and Task 2 remain available with their original IDs and content", () => {
  assert.deepEqual(
    prompts.map((q) => q.id),
    ["w1", "w2", "w3", "w4", "w5", "w6", "w7"],
  );
  assert.deepEqual(
    prompts
      .filter((q) => q.task === 1)
      .map((q) => [q.id, q.title, q.headers, q.rows]),
    [
      [
        "w1",
        "Commuting patterns",
        ["Mode of transport", "2010", "2020"],
        [
          ["Car", "60%", "45%"],
          ["Bus", "30%", "35%"],
          ["Bicycle", "10%", "20%"],
        ],
      ],
      [
        "w2",
        "Household expenditure",
        ["Category", "Brookfield", "Lakeside"],
        [
          ["Housing", "900", "750"],
          ["Food", "350", "400"],
          ["Transport", "200", "250"],
          ["Leisure", "150", "150"],
        ],
      ],
      [
        "w3",
        "Library use over time",
        ["Measure", "2015", "2020", "2025"],
        [
          ["Registered members", "4,000", "4,800", "6,200"],
          ["Physical book loans", "60,000", "48,000", "42,000"],
          ["Digital loans", "5,000", "22,000", "51,000"],
        ],
      ],
    ],
  );
  assert.ok(prompts.every((q) => !q.visual));
  assert.equal(prompts.filter((q) => q.task === 2).length, 4);
  assert.equal(
    prompts.find((q) => q.id === "w5")?.question,
    "Governments should spend more money on public transport than on building new roads. To what extent do you agree or disagree?",
  );
});
function validate(v: Visual) {
  if (v.kind === "bar" || v.kind === "line") {
    assert.ok(v.unit && v.xLabel && v.title);
    assert.ok(v.labels.length >= 3);
    assert.ok(v.series.length > 0 && v.series.length <= 3);
    for (const s of v.series) {
      assert.equal(s.values.length, v.labels.length);
      assert.ok(s.name);
      assert.ok(s.values.every((n) => Number.isFinite(n) && n >= 0));
      if (v.max) assert.ok(s.values.every((n) => n <= v.max!));
    }
  } else if (v.kind === "pie") {
    assert.ok(v.unit && v.labels.length <= 5);
    assert.ok(v.panels.length);
    for (const p of v.panels) {
      assert.equal(p.values.length, v.labels.length);
      assert.equal(
        p.values.reduce((a, b) => a + b, 0),
        100,
      );
      assert.ok(p.values.every((n) => n > 0));
    }
  } else if (v.kind === "table") {
    assert.ok(v.unit);
    assert.ok(v.rows.length >= 3);
    assert.ok(
      v.rows.every((r) => r.length === v.headers.length && r.every(Boolean)),
    );
  } else if (v.kind === "process") {
    assert.ok(v.steps.length >= 6 && v.steps.length <= 9);
    assert.equal(new Set(v.steps.map((s) => s.label)).size, v.steps.length);
    assert.ok(v.steps.every((s) => s.detail));
    assert.ok(v.note);
  } else if (v.kind === "map") {
    assert.equal(v.periods.length, 2);
    for (const p of v.periods) {
      assert.ok(p.features.length >= 5);
      for (const f of p.features) {
        assert.ok(f.x >= 30 && f.x + f.width <= 570);
        assert.ok(f.y >= 50 && f.y + f.height <= 330);
        assert.ok(
          f.y + f.height <= 180 || f.y >= 205,
          "feature must not cover the road",
        );
      }
    }
  } else if (v.kind === "mixed") {
    assert.ok(v.charts.length >= 2);
    v.charts.forEach(validate);
  }
}
test("visual datasets have consistent dimensions, units, totals, and map geometry", () => {
  visualQuestions.forEach((q) => validate(q.visual));
});
test("mixed charts share consistent cohorts and category totals", () => {
  const water = visualQuestions.find((q) => q.id === "v-mixed-2")!.visual;
  assert.equal(water.kind, "mixed");
  if (water.kind === "mixed" && water.charts[0].kind === "bar")
    for (const s of water.charts[0].series)
      assert.equal(
        s.values.reduce((a, b) => a + b, 0),
        100,
      );
  const grads = visualQuestions.find((q) => q.id === "v-mixed-3")!.visual;
  if (grads.kind === "mixed" && grads.charts[0].kind === "bar")
    assert.equal(
      grads.charts[0].series[0].values.reduce((a, b) => a + b, 0),
      2400,
    );
});
test("category randomization stays within the filter and never repeats the current question", () => {
  for (const category of [
    "all",
    ...visualCategories.map((c) => c.id),
  ] as const) {
    const current = questionsInCategory(category)[0].id;
    for (const r of [0, 0.1, 0.5, 0.99, 1]) {
      const next = randomVisualQuestion(category, current, () => r);
      assert.notEqual(next.id, current);
      assert.ok(questionsInCategory(category).some((q) => q.id === next.id));
    }
  }
});
test("all 21 visuals render valid finite geometry with accessible names and enlargement controls", () => {
  for (const q of visualQuestions) {
    const html = renderToStaticMarkup(
      createElement(QuestionVisual, { visual: q.visual }),
    );
    assert.ok(html.includes("Enlarge visual"), q.id);
    assert.ok(html.includes('aria-label="Question visual"'));
    assert.ok(!/NaN|Infinity|undefined/.test(html), q.id);
    assert.ok(
      html.includes(q.visual.kind === "table" ? "<table" : "<svg"),
      q.id,
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `duplicate SVG IDs in ${q.id}`);
  }
});
test("Basic and Visual drafts coexist under the original storage schema", () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
  });
  const basic = {
    text: "Original saved response",
    elapsed: 42000,
    status: "paused",
    updated: "2026-10-20",
  };
  write(KEYS.drafts, { w1: basic });
  const current = read<Record<string, unknown>>(KEYS.drafts, {}, validDrafts);
  write(KEYS.drafts, {
    ...current,
    "v-bar-1": { ...basic, text: "New visual response" },
  });
  const result = read<Record<string, { text: string }>>(
    KEYS.drafts,
    {},
    validDrafts,
  );
  assert.equal(result.w1.text, basic.text);
  assert.equal(result["v-bar-1"].text, "New visual response");
});
test("the shared Task 1 clock clamps at 20 minutes for Basic and Visual sessions", () => {
  assert.equal(
    elapsedMs({ elapsed: 40000, started: 1000 }, 1160999, 1200000),
    1199999,
  );
  assert.equal(
    elapsedMs({ elapsed: 40000, started: 1000 }, 1161000, 1200000),
    1200000,
  );
  assert.equal(
    elapsedMs({ elapsed: 40000, started: 1000 }, 9999999, 1200000),
    1200000,
  );
  assert.equal(
    elapsedMs({ elapsed: 40000, started: null }, 9999999, 1200000),
    40000,
  );
});
