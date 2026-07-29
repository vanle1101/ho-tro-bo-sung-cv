"use server";

import { Client } from "pg";

// Workerd không cho phép dùng lại kết nối TCP giữa các request,
// nên mỗi request phải mở một kết nối mới và đóng ngay sau khi xong.
export async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("MISSING_DATABASE_URL");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

const COOKIE_NAME = "cv_browser";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 năm

export async function readBrowserId(request: Request): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      const value = rest.join("=").trim();
      if (/^[0-9a-f-]{36}$/i.test(value)) return value;
    }
  }
  return null;
}

export async function newBrowserId(): Promise<string> {
  return crypto.randomUUID();
}

export async function browserCookieHeader(browserId: string): Promise<string> {
  return `${COOKIE_NAME}=${browserId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}
