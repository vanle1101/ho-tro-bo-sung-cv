---
name: Gemini migration
description: The CV review app uses Google Gemini (not OpenAI); constraints that shaped the design.
---

The app was switched from OpenAI Responses API to Gemini generateContent at the user's request (July 2026).

**Why:** User declined to keep OpenAI and explicitly asked for Gemini ("t muốn đổi sang api của gemini").

**How to apply:**
- Gemini is stateless: no `previous_response_id`. The browser resends the CV PDF plus full chat history each turn; do not reintroduce server-side session assumptions.
- Gemini document understanding only reads PDF — DOC/DOCX uploads were removed on purpose.
- Model name must come from the `GEMINI_MODEL` secret/env with NO hardcoded fallback in code; a completion review rejected a hardcoded default. Missing/invalid model returns actionable Vietnamese errors (503/502).
- No Replit integration exists for Gemini (checked July 2026); `GEMINI_API_KEY` is a plain user-provided secret.

## Workerd dev-runtime quirks (vinext + @cloudflare/vite-plugin)
- The worker does NOT inherit host env vars (Replit Secrets). They must be forwarded as worker `vars` in `vite.config.ts` (`localBindingConfig.vars`, read from `process.env` at config time). A `.dev.vars` file would also work but writes secrets to disk.
- Workerd's outbound TLS fails on NixOS with "TLS peer's certificate is not trusted" because its OpenSSL can't find the system CA bundle. Fix: `SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt` in the `dev` script (package.json).
