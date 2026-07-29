import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  // Forward app configuration from the host environment (Replit Secrets)
  // into the local worker runtime, which does not inherit host env vars.
  vars: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "",
    DATABASE_URL: process.env.DATABASE_URL ?? "",
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    resolve: {
      alias: {
        "pg-int8": "./node_modules/pg/node_modules/pg-int8",
        "postgres-array": "./node_modules/pg/node_modules/postgres-array",
        "postgres-bytea": "./node_modules/pg/node_modules/postgres-bytea",
        "postgres-date": "./node_modules/pg/node_modules/postgres-date",
        "postgres-interval": "./node_modules/pg/node_modules/postgres-interval",
      },
    },
    optimizeDeps: {
      exclude: ["pg", "pg-types", "pg-int8", "drizzle-orm"],
    },
    plugins: [
      vinext(),
      sites(),
      {
        name: "exclude-server-modules",
        apply: "serve",
        resolveId(id) {
          // Exclude server-only modules from client-side bundling
          if (id.includes("lib/db") || id.includes("lib/db.ts")) {
            return { id, external: true, moduleSideEffects: false };
          }
        },
        load(id) {
          // Return empty module for server-only imports in client env
          if (id.includes("lib/db")) {
            return "export const withDb = () => {}; export const readBrowserId = () => {}; export const newBrowserId = () => {}; export const browserCookieHeader = () => {};";
          }
        },
      },
    ],
  };
});
