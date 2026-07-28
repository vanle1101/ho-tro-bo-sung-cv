import { GVHD_SYSTEM_PROMPT } from "../../../lib/gvhd-prompt";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx)$/i;
const MAX_ANSWER_LENGTH = 12_000;

type OutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function outputText(data: { output_text?: string; output?: OutputItem[] }) {
  if (data.output_text) return data.output_text;
  return (data.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n");
}

async function callOpenAI(body: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      instructions: GVHD_SYSTEM_PROMPT,
      reasoning: {
        effort: process.env.OPENAI_REASONING_EFFORT || "medium",
        context: "all_turns",
      },
      text: { verbosity: "high" },
      store: true,
      ...body,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OPENAI_ERROR:${data?.error?.message || "OpenAI API không trả về kết quả."}`);
  }
  const text = outputText(data);
  if (!text) throw new Error("EMPTY_RESPONSE");
  return { text, responseId: data.id as string };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("cv");
      const role = String(form.get("role") || "").trim();

      if (!(file instanceof File)) {
        return Response.json({ error: "Em chưa gửi file CV." }, { status: 400 });
      }
      if (!ALLOWED_EXTENSIONS.test(file.name)) {
        return Response.json({ error: "CV phải là file PDF, DOC hoặc DOCX." }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return Response.json({ error: "CV vượt quá giới hạn 10 MB." }, { status: 400 });
      }
      if (role.length < 3) {
        return Response.json({ error: "Em cần ghi rõ vị trí ứng tuyển." }, { status: 400 });
      }

      const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const lowerName = file.name.toLowerCase();
      const mime = file.type || (
        lowerName.endsWith(".pdf")
          ? "application/pdf"
          : lowerName.endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/msword"
      );
      const input = [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Hãy bắt đầu đúng GIAI ĐOẠN 1.",
              `Vị trí ứng tuyển: ${role}`,
              `Tên file CV: ${file.name}`,
              "Không có JD. Đọc toàn bộ file CV đính kèm, đánh giá theo vị trí ứng tuyển và trích đúng mục hoặc câu làm bằng chứng.",
            ].join("\n\n"),
          },
          {
            type: "input_file",
            filename: file.name,
            file_data: `data:${mime};base64,${base64}`,
            ...(file.name.toLowerCase().endsWith(".pdf") ? { detail: "high" } : {}),
          },
        ],
      }];
      return Response.json(await callOpenAI({ input }));
    }

    const payload = await request.json();
    const answer = String(payload.answer || "").trim();
    const previousResponseId = String(payload.previousResponseId || "").trim();
    if (!answer) {
      return Response.json({ error: "Em chưa nhập câu trả lời." }, { status: 400 });
    }
    if (answer.length > MAX_ANSWER_LENGTH) {
      return Response.json(
        { error: "Câu trả lời quá dài. Em hãy chia thành từng phần ngắn hơn." },
        { status: 400 },
      );
    }
    if (!previousResponseId) {
      return Response.json({ error: "Phiên hướng dẫn đã mất. Em hãy gửi lại CV." }, { status: 400 });
    }
    return Response.json(await callOpenAI({
      previous_response_id: previousResponseId,
      input: [{ role: "user", content: [{ type: "input_text", text: answer }] }],
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "MISSING_API_KEY") {
      return Response.json(
        { error: "Chưa cấu hình OPENAI_API_KEY trong Secrets của Replit." },
        { status: 503 },
      );
    }
    if (message.startsWith("OPENAI_ERROR:")) {
      return Response.json({ error: message.slice(13) }, { status: 502 });
    }
    return Response.json(
      { error: "Không thể xử lý hồ sơ lúc này. Em hãy thử lại." },
      { status: 500 },
    );
  }
}
