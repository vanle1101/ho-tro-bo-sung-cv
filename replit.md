# Cô Hướng Dẫn CV

Vietnamese CV-coaching web app. Reads a résumé + target job title, runs a deep-dive interview, then suggests concrete edits.

## Stack

- **Framework**: Next.js 16 / React 19 via [Vinext](https://github.com/cloudflare/vinext) (Vite + Cloudflare Worker runtime)
- **Styling**: Tailwind CSS 4
- **AI**: OpenAI Responses API (file input + multi-turn via `previous_response_id`)
- **Prompt**: `lib/gvhd-prompt.ts`
- **API route**: `app/api/review/`

## How to run

```bash
npm run dev -- --host 0.0.0.0 --port 5000
```

The workflow "Start application" does this automatically.

## Required secrets

| Key | Where to get it |
|-----|----------------|
| `OPENAI_API_KEY` | platform.openai.com |

## Optional env vars

| Key | Default | Notes |
|-----|---------|-------|
| `OPENAI_MODEL` | `gpt-5.6` | Model alias |
| `OPENAI_REASONING_EFFORT` | `medium` | `low` / `medium` / `high` / `xhigh` / `max` |

## User preferences

<!-- Add remembered preferences here -->
