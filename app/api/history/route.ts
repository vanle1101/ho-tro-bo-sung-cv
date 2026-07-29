import { readBrowserId, withDb } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const browserId = readBrowserId(request);
    if (!browserId) return Response.json({ sessions: [] });
    const rows = await withDb(async (db) => {
      const result = await db.query(
        `SELECT s.id, s.file_name, s.role, s.depth, s.created_at, s.updated_at,
                (SELECT COUNT(*)::int FROM cv_messages m WHERE m.session_id = s.id) AS message_count
         FROM cv_sessions s
         WHERE s.browser_id = $1
         ORDER BY s.updated_at DESC
         LIMIT 30`,
        [browserId],
      );
      return result.rows;
    });
    return Response.json({
      sessions: rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        role: row.role,
        depth: row.depth,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: row.message_count,
      })),
    });
  } catch (error) {
    console.error("[history] list failed:", error);
    return Response.json({ error: "Không tải được lịch sử hồ sơ." }, { status: 500 });
  }
}
