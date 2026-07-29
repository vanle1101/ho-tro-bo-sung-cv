import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// --- API route tests: depth -> thinkingBudget forwarded to Gemini ---------

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-test-model";

const { POST } = await import(new URL("../app/api/review/route.ts", import.meta.url).href);

const originalFetch = globalThis.fetch;

function mockGemini() {
  const captured = { body: null, url: null };
  globalThis.fetch = async (url, init) => {
    captured.url = String(url);
    captured.body = JSON.parse(init.body);
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "OK" }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  return captured;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function makeForm({ depth, answer, history } = {}) {
  const form = new FormData();
  form.append("cv", new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "cv.pdf", { type: "application/pdf" }));
  form.append("role", "Thực tập sinh Kiểm toán");
  if (depth !== undefined) form.append("depth", depth);
  if (answer !== undefined) form.append("answer", answer);
  if (history !== undefined) form.append("history", history);
  return form;
}

async function postForm(form) {
  const request = new Request("http://localhost/api/review", { method: "POST", body: form });
  return POST(request);
}

test("API: valid depths forward the correct thinkingBudget to Gemini", async () => {
  const expected = { quick: 0, standard: 8192, deep: 24576 };
  try {
    for (const [depth, budget] of Object.entries(expected)) {
      const captured = mockGemini();
      const response = await postForm(makeForm({ depth }));
      assert.equal(response.status, 200, `depth=${depth} should succeed`);
      assert.equal(
        captured.body.generationConfig.thinkingConfig.thinkingBudget,
        budget,
        `depth=${depth} should forward thinkingBudget=${budget}`,
      );
    }
  } finally {
    restoreFetch();
  }
});

test("API: invalid or missing depth falls back to standard (8192)", async () => {
  try {
    for (const depth of ["turbo", "", undefined]) {
      const captured = mockGemini();
      const response = await postForm(makeForm({ depth }));
      assert.equal(response.status, 200);
      assert.equal(
        captured.body.generationConfig.thinkingConfig.thinkingBudget,
        8192,
        `depth=${JSON.stringify(depth)} should fall back to standard budget`,
      );
    }
  } finally {
    restoreFetch();
  }
});

test("API: follow-up turn also forwards depth-derived thinkingBudget", async () => {
  const captured = mockGemini();
  try {
    const history = JSON.stringify([
      { role: "assistant", text: "Câu hỏi đầu tiên?" },
    ]);
    const response = await postForm(makeForm({ depth: "deep", answer: "Em đã làm X.", history }));
    assert.equal(response.status, 200);
    assert.equal(captured.body.generationConfig.thinkingConfig.thinkingBudget, 24576);
    // Sanity: the follow-up conversation was actually rebuilt.
    assert.ok(captured.body.contents.length >= 3);
  } finally {
    restoreFetch();
  }
});

// --- Frontend tests: depth appended to FormData on every turn -------------

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `function ${name} should exist in app/page.tsx`);
  let depthCount = 0;
  let end = start;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depthCount++;
    else if (source[i] === "}") {
      depthCount--;
      if (depthCount === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return source.slice(start, end);
}

test("frontend: startReview appends depth to FormData (initial turn)", () => {
  const fn = extractFunction(pageSource, "startReview");
  assert.match(fn, /\.append\(\s*["']depth["']\s*,\s*depth\s*\)/);
});

test("frontend: sendAnswer appends depth to FormData (follow-up turn)", () => {
  const fn = extractFunction(pageSource, "sendAnswer");
  assert.match(fn, /\.append\(\s*["']depth["']\s*,\s*depth\s*\)/);
  assert.match(fn, /\.append\(\s*["']answer["']/, "sendAnswer should still send the answer");
  assert.match(fn, /\.append\(\s*["']history["']/, "sendAnswer should still send the history");
});
