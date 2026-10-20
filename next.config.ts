import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Robust project-root resolution that works whether next.config.ts is loaded
// as ESM (import.meta.url) or CJS (__dirname). Hardcoded fallback as last resort.
const projectRoot: string = (() => {
  try {
    // ESM context
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    try {
      // CJS context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (globalThis as any).__dirname ?? process.cwd();
    } catch {
      return process.cwd();
    }
  }
})();

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root so it ignores the parent wrapper folder
  // and the user-home package-lock.json sitting at C:\Users\karro\.
  turbopack: {
    root: projectRoot,
  },
  // Mirror the same pin for the webpack pipeline (used by `next build`,
  // CSS workers, and PostCSS plugin resolution). This forces module
  // resolution to start from the real project's node_modules.
  webpack(config) {
    config.context = projectRoot;
    config.resolve = config.resolve ?? {};
    const existingModules = Array.isArray(config.resolve.modules)
      ? config.resolve.modules
      : [];
    config.resolve.modules = [
      path.join(projectRoot, "node_modules"),
      ...existingModules,
      "node_modules",
    ];
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com; frame-ancestors 'none';",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
