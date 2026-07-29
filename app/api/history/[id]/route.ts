import { readBrowserId, withDb } from "../../../../lib/db";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const browserId = await readBrowserId(request);
    if (!browserId || !UUID_RE.test(id)) {
      return Response.json({ error: "Không tìm thấy phiên này." }, { status: 404 });
    }
    const payload = await withDb(async (db) => {
      const session = await db.query(
        `SELECT id, file_name, role, depth, pdf_base64
         FROM cv_sessions WHERE id = $1 AND browser_id = $2`,
        [id, browserId],
      );
      if (!session.rowCount) return null;
      const messages = await db.query(
        `SELECT role, text FROM cv_messages WHERE session_id = $1 ORDER BY id`,
        [id],
      );
      const row = session.rows[0];
      return {
        id: row.id,
        fileName: row.file_name,
        role: row.role,
        depth: row.depth,
        pdfBase64: row.pdf_base64,
        messages: messages.rows,
      };
    });
    if (!payload) {
      return Response.json({ error: "Không tìm thấy phiên này." }, { status: 404 });
    }
    return Response.json(payload);
  } catch (error) {
    console.error("[history] detail failed:", error);
    return Response.json({ error: "Không tải được phiên này." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const browserId = await readBrowserId(request);
    if (!browserId || !UUID_RE.test(id)) {
      return Response.json({ error: "Không tìm thấy phiên này." }, { status: 404 });
    }
    const deleted = await withDb(async (db) => {
      const result = await db.query(
        `DELETE FROM cv_sessions WHERE id = $1 AND browser_id = $2`,
        [id, browserId],
      );
      return result.rowCount ?? 0;
    });
    if (!deleted) {
      return Response.json({ error: "Không tìm thấy phiên này." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[history] delete failed:", error);
    return Response.json({ error: "Không xóa được phiên này." }, { status: 500 });
  }
}
