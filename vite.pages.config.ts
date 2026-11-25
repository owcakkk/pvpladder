import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Static (GitHub Pages) build. Used only by .github/workflows/deploy-pages.yml
const BASE = process.env.PAGES_BASE ?? "/";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } },
  },
  vite: { base: BASE },
});
