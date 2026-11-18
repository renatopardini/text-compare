import type { NextConfig } from "next";

// `npm run build:static` gera HTML/JS/CSS puros em out/, usados pelo app desktop (Electron).
// O npm define npm_lifecycle_event com o nome do script; `build`/`start` seguem normais.
const isStaticExport = process.env.npm_lifecycle_event === "build:static";

const nextConfig: NextConfig = {
  ...(isStaticExport && { output: "export" }),
  // Cache Components liga o PPR, que exige servidor: desligado no export estático.
  cacheComponents: !isStaticExport,
  partialPrefetching: !isStaticExport,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
