// Resolve extensionless imports to .ts files so node --test can load
// TypeScript route modules (used together with --experimental-strip-types).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error?.code === "ERR_MODULE_NOT_FOUND" &&
        (specifier.startsWith("./") || specifier.startsWith("../")) &&
        context.parentURL
      ) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) {
          return nextResolve(pathToFileURL(fileURLToPath(candidate)).href, context);
        }
      }
      throw error;
    }
  },
});
