/// <reference types="vitest/config" />
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

// Mode used by `bun run build:single` (see package.json). Produces a single
// self-contained HTML file for the Deco Studio iframe (ticket #5) — no
// external src=/href= references, everything inlined as data: URIs.
const SINGLEFILE_MODE = "singlefile"

// The Studio iframe CSP has no route for a favicon request, and
// `vite-plugin-singlefile` explicitly does not inline files referenced from
// `public/` (see its README "Caveats"). Rather than leave a relative
// `/vite.svg` reference in the single-file output, drop the tag for this
// mode only — `bun dev` and the normal `bun run build` keep the icon.
function stripFaviconForSinglefile(): Plugin {
  return {
    name: "strip-favicon-for-singlefile",
    transformIndexHtml(html) {
      return html.replace(/\s*<link rel="icon"[^>]*\/?>\n?/, "\n")
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isSinglefile = mode === SINGLEFILE_MODE

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isSinglefile
        ? [stripFaviconForSinglefile(), viteSingleFile()]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    // `public/` (just vite.svg, the favicon we strip above) would otherwise
    // be copied into outDir verbatim, breaking the "exactly one file" build.
    publicDir: isSinglefile ? false : undefined,
    build: isSinglefile
      ? {
          outDir: "dist-single",
          emptyOutDir: true,
        }
      : undefined,
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/setupTests.ts"],
    },
  }
})
