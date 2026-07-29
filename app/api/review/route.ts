import { GVHD_SYSTEM_PROMPT } from "../../../lib/gvhd-prompt";
import { browserCookieHeader, newBrowserId, readBrowserId, withDb } from "../../../lib/db";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.pdf$/i;
const MAX_ANSWER_LENGTH = 12_000;
const MAX_HISTORY_MESSAGES = 200;

type HistoryMessage = { role: "assistant" | "user"; text: string };

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function firstTurnText(role: string, fileName: string) {
  return [
    "Hãy bắt đầu đúng GIAI ĐOẠN 1.",
    `Vị trí ứng tuyển: ${role}`,
    `Tên file CV: ${fileName}`,
    "Không có JD. Đọc toàn bộ file CV đính kèm, đánh giá theo vị trí ứng tuyển và trích đúng mục hoặc câu làm bằng chứng.",
  ].join("\n\n");
}

const DEPTH_BUDGET: Record<string, number> = {
  quick: 1024,
  standard: 8192,
  deep: 24576,
};

async function callGemini(contents: GeminiContent[], depth = "standard") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const model = process.env.GEMINI_MODEL;
  if (!model) throw new Error("MISSING_MODEL");
  const thinkingBudget = DEPTH_BUDGET[depth] ?? DEPTH_BUDGET.standard;
  console.log(`[review] using model: ${model} depth: ${depth} thinkingBudget: ${thinkingBudget}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: GVHD_SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          thinkingConfig: { thinkingBudget },
        },
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    const errMsg: string = data?.error?.message ?? "Gemini API không trả về kết quả.";
    const isModelError =
      response.status === 404 ||
      /is not found|not supported|invalid.*model|model.*invalid/i.test(errMsg);
    if (isModelError) {
      console.error(`[review] model error (model=${model}): ${errMsg}`);
      throw new Error(`INVALID_MODEL:${model}`);
    }
    throw new Error(`GEMINI_ERROR:${errMsg}`);
  }

  const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("EMPTY_RESPONSE");
  return { text };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("cv");
    const role = String(form.get("role") || "").trim();
    const answer = String(form.get("answer") || "").trim();
    const historyRaw = String(form.get("history") || "");
    const rawDepth = String(form.get("depth") || "").trim();
    const depth = ["quick", "standard", "deep"].includes(rawDepth) ? rawDepth : "standard";
    const sessionIdRaw = String(form.get("sessionId") || "").trim();

    if (!(file instanceof File)) {
      return Response.json({ error: "Em chưa gửi file CV." }, { status: 400 });
    }
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      return Response.json({ error: "CV phải là file PDF (Gemini chỉ đọc được PDF)." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "CV vượt quá giới hạn 10 MB." }, { status: 400 });
    }
    if (role.length < 3) {
      return Response.json({ error: "Em cần ghi rõ vị trí ứng tuyển." }, { status: 400 });
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const contents: GeminiContent[] = [
      {
        role: "user",
        parts: [
          { text: firstTurnText(role, file.name) },
          { inline_data: { mime_type: "application/pdf", data: base64 } },
        ],
      },
    ];

    if (answer || historyRaw) {
      // Follow-up turn: rebuild the whole conversation for the stateless Gemini API.
      if (!answer) {
        return Response.json({ error: "Em chưa nhập câu trả lời." }, { status: 400 });
      }
      if (answer.length > MAX_ANSWER_LENGTH) {
        return Response.json(
          { error: "Câu trả lời quá dài. Em hãy chia thành từng phần ngắn hơn." },
          { status: 400 },
        );
      }

      let history: HistoryMessage[] = [];
      try {
        const parsed = JSON.parse(historyRaw);
        if (Array.isArray(parsed)) history = parsed;
      } catch {
        // fall through to the empty-history check below
      }
      if (!history.length) {
        return Response.json({ error: "Phiên hướng dẫn đã mất. Em hãy gửi lại CV." }, { status: 400 });
      }
      if (history.length > MAX_HISTORY_MESSAGES) {
        return Response.json(
          { error: "Phiên hướng dẫn quá dài. Em hãy bắt đầu phiên mới." },
          { status: 400 },
        );
      }

      for (const message of history) {
        const text = String(message?.text || "").slice(0, MAX_ANSWER_LENGTH * 2);
        if (!text) continue;
        contents.push({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text }],
        });
      }
      contents.push({ role: "user", parts: [{ text: answer }] });
    }

    const result = await callGemini(contents, depth);

    // Lưu lịch sử theo trình duyệt. Nếu lưu thất bại thì phiên vẫn tiếp tục bình thường.
    let browserId = readBrowserId(request);
    let setCookie: string | null = null;
    if (!browserId) {
      browserId = newBrowserId();
      setCookie = browserCookieHeader(browserId);
    }
    let sessionId: string | null = null;
    try {
      sessionId = await withDb(async (db) => {
        if (answer && sessionIdRaw) {
          // Lượt tiếp theo của một phiên đã lưu — chỉ ghi nếu phiên thuộc đúng trình duyệt này.
          const owned = await db.query(
            "UPDATE cv_sessions SET updated_at = now() WHERE id = $1 AND browser_id = $2 RETURNING id",
            [sessionIdRaw, browserId],
          );
          if (!owned.rowCount) return null;
          try {
            await db.query("BEGIN");
            await db.query(
              "INSERT INTO cv_messages (session_id, role, text) VALUES ($1, 'user', $2), ($1, 'assistant', $3)",
              [sessionIdRaw, answer, result.text],
            );
            await db.query("COMMIT");
          } catch (txError) {
            await db.query("ROLLBACK").catch(() => {});
            throw txError;
          }
          return sessionIdRaw;
        }
        if (!answer) {
          // Lượt đầu tiên — tạo phiên mới kèm file CV.
          const inserted = await db.query(
            "INSERT INTO cv_sessions (browser_id, file_name, role, depth, pdf_base64) VALUES ($1, $2, $3, $4, $5) RETURNING id",
            [browserId, file.name, role, depth, base64],
          );
          const newId: string = inserted.rows[0].id;
          await db.query(
            "INSERT INTO cv_messages (session_id, role, text) VALUES ($1, 'assistant', $2)",
            [newId, result.text],
          );
          return newId;
        }
        return null;
      });
    } catch (persistError) {
      console.error("[review] history save failed:", persistError);
    }

    const headers = new Headers({ "Content-Type": "application/json" });
    if (setCookie) headers.set("Set-Cookie", setCookie);
    return new Response(JSON.stringify({ ...result, sessionId }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "MISSING_API_KEY") {
      return Response.json(
        { error: "Chưa cấu hình GEMINI_API_KEY trong Secrets của Replit." },
        { status: 503 },
      );
    }
    if (message === "MISSING_MODEL") {
      return Response.json(
        { error: "Chưa cấu hình GEMINI_MODEL trong Secrets của Replit. Hãy thêm GEMINI_MODEL với tên model hợp lệ (ví dụ: gemini-2.5-flash)." },
        { status: 503 },
      );
    }
    if (message.startsWith("INVALID_MODEL:")) {
      const modelName = message.slice(14);
      return Response.json(
        {
          error: `Model "${modelName}" không tồn tại hoặc không được hỗ trợ. Hãy cập nhật GEMINI_MODEL trong Replit Secrets sang tên model hợp lệ (ví dụ: gemini-2.5-flash).`,
        },
        { status: 502 },
      );
    }
    if (message.startsWith("GEMINI_ERROR:")) {
      return Response.json({ error: message.slice(13) }, { status: 502 });
    }
    return Response.json(
      { error: "Không thể xử lý hồ sơ lúc này. Em hãy thử lại." },
      { status: 500 },
    );
  }
}
