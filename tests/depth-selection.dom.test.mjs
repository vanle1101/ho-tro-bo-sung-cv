// Behavior-level frontend tests: render the real intake page in a DOM,
// interact with it like a user, and assert the FormData actually sent to
// /api/review carries the chosen depth. These tests survive refactors of
// app/page.tsx (renamed functions, extracted hooks) because they never
// inspect the source — only observed network behavior.
//
// Runs with: node --import tsx --test tests/depth-selection.dom.test.mjs

import assert from "node:assert/strict";
import test from "node:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "http://localhost/" });

// React act() support outside a test renderer.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default ?? (await import("react"));
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const Page = (await import("../app/page.tsx")).default;

const realFetch = globalThis.fetch;

/** Mock fetch, capturing every call to /api/review. */
function mockFetch() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({ text: "Câu hỏi đầu tiên của cô?" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  return calls;
}

function makePdf(name = "cv.pdf") {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, {
    type: "application/pdf",
  });
}

async function renderPage() {
  window.localStorage.clear();
  document.body.innerHTML = "<div id='root'></div>";
  const container = document.getElementById("root");
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(Page));
  });
  return { container, root };
}

function setNativeValue(element, value) {
  const proto = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor.set.call(element, value);
}

async function uploadPdf(container) {
  const input = container.querySelector("input[type=file]");
  assert.ok(input, "file input should exist");
  const file = makePdf();
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => [file],
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function fillRole(container, value = "Thực tập sinh Kiểm toán") {
  const roleInput = Array.from(container.querySelectorAll("input")).find(
    (el) => el.type !== "file" && el.type !== "checkbox",
  );
  assert.ok(roleInput, "role text input should exist");
  setNativeValue(roleInput, value);
  await act(async () => {
    roleInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function selectDepth(container, depth) {
  const select = container.querySelector("select");
  assert.ok(select, "depth select should exist");
  setNativeValue(select, depth);
  await act(async () => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function findButtonByText(container, text) {
  return Array.from(container.querySelectorAll("button")).find((el) =>
    el.textContent.includes(text),
  );
}

async function submitIntake(container) {
  const button = findButtonByText(container, "Bắt đầu đọc hồ sơ");
  assert.ok(button, "start button should exist");
  assert.equal(button.disabled, false, "start button should be enabled");
  await act(async () => {
    button.click();
  });
}

function lastReviewCall(calls) {
  const reviewCalls = calls.filter((c) => c.url.includes("/api/review"));
  assert.ok(reviewCalls.length > 0, "a request to /api/review should be sent");
  return reviewCalls[reviewCalls.length - 1];
}

function assertFormDepth(call, depth) {
  const body = call.init?.body;
  assert.ok(body instanceof FormData, "request body should be FormData");
  assert.equal(body.get("depth"), depth, `FormData depth should be ${depth}`);
  assert.ok(body.get("cv") instanceof File, "FormData should include the CV file");
  assert.ok(String(body.get("role")).length > 2, "FormData should include the role");
  return body;
}

for (const depth of ["quick", "standard", "deep"]) {
  test(`DOM: intake submit sends FormData with depth=${depth}`, async () => {
    const calls = mockFetch();
    const { container, root } = await renderPage();
    try {
      await uploadPdf(container);
      await fillRole(container);
      await selectDepth(container, depth);
      await submitIntake(container);
      assertFormDepth(lastReviewCall(calls), depth);
    } finally {
      await act(async () => root.unmount());
      globalThis.fetch = realFetch;
    }
  });
}

test("DOM: follow-up answer turn sends FormData with the chosen depth", async () => {
  const calls = mockFetch();
  const { container, root } = await renderPage();
  try {
    await uploadPdf(container);
    await fillRole(container);
    await selectDepth(container, "deep");
    await submitIntake(container);
    calls.length = 0;

    // The review session should now render an answer textarea.
    const textarea = container.querySelector("textarea");
    assert.ok(textarea, "answer textarea should render after intake submit");
    setNativeValue(textarea, "Em đã trực tiếp làm sạch dữ liệu bằng SQL.");
    await act(async () => {
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const form = textarea.closest("form");
    assert.ok(form, "answer form should exist");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const body = assertFormDepth(lastReviewCall(calls), "deep");
    assert.equal(body.get("answer"), "Em đã trực tiếp làm sạch dữ liệu bằng SQL.");
    const history = JSON.parse(String(body.get("history")));
    assert.ok(Array.isArray(history) && history.length >= 1, "history should carry prior turns");
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = realFetch;
  }
});
