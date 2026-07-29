---
name: Workerd + Postgres
description: How database access must be structured in the vinext/workerd runtime.
---

The rule: never share a pg connection/Pool across requests in the workerd runtime — open a `pg` Client per request and close it in `finally` (see `lib/db.ts` withDb).

**Why:** Workerd forbids cross-request I/O reuse. A module-level `Pool` worked for the first request, then the next request hung until "Workers runtime canceled this request … code had hung" (July 2026).

**How to apply:**
- Any new API route touching Postgres must go through `withDb` (per-request Client), not a cached Pool.
- `DATABASE_URL` (like all env vars) must be forwarded to the worker via `vite.config.ts` localBindingConfig.vars for dev.
- The Replit DB URL here is a local helium proxy with `sslmode=disable` — NOT Neon; the `@neondatabase/serverless` HTTP driver does not work, plain `pg` over TCP does (nodejs_compat).

Related: `gemini-3.6-flash` rejects `thinkingBudget: 0` ("Request contains an invalid argument") — minimum useful budget used for "quick" depth is 1024.
