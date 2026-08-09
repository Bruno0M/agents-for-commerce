// @vitest-environment node
/// <reference types="node" />
/**
 * Guards the acceptance criteria of ticket #5 ("Build single-file do
 * apps/web"): a `bun run build:single` mode that produces exactly one
 * self-contained HTML file, safe to drop into the Deco Studio iframe under
 * the CSP in apps/studio/packages/shared/src/mcp-apps/csp-injector.ts
 * (`default-src 'none'`, `connect-src 'none'`, no external hosts allowed
 * anywhere). A stray `src="/foo.js"` or a leaked bearer token doesn't throw
 * in that iframe — it just renders a blank screen with no console error, so
 * this test is the only signal a broken build gets before it ships. It
 * runs the real build (not a mock) and inspects the actual output file.
 */
import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"

const repoRoot = path.resolve(import.meta.dirname, "..")
const outDir = path.resolve(repoRoot, "dist-single")

// A Vite build takes tens of seconds; give it a lot of room before vitest
// gives up and reports a misleading timeout failure instead of the real one.
const BUILD_TIMEOUT_MS = 180_000

/** Reads `KEY=value` pairs out of a dotenv-style file, ignoring comments/blank lines. */
function readDotEnv(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

/**
 * The bearer token value, if one is reachable from this checkout: env var
 * first (CI-style), then a local `.env` in apps/web or apps/mcp-server
 * (dev-style). Only used to strengthen the assertion when available — the
 * variable-*name* assertion below runs unconditionally either way.
 */
function findBearerTokenValue(): string | undefined {
  const fromEnv = process.env.MCP_BEARER_TOKEN
  if (fromEnv) return fromEnv

  const candidateEnvFiles = [
    path.resolve(repoRoot, ".env"),
    path.resolve(repoRoot, "..", "mcp-server", ".env"),
  ]
  for (const file of candidateEnvFiles) {
    const value = readDotEnv(file).MCP_BEARER_TOKEN
    if (value) return value
  }
  return undefined
}

/** Whether an HTML `src`/`href` value is allowed in a zero-network single-file build. */
function isAllowedReference(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("#")
}

describe("build:single", () => {
  it(
    "builds",
    () => {
      execSync("bun run build:single", {
        cwd: repoRoot,
        stdio: "pipe",
      })
    },
    BUILD_TIMEOUT_MS,
  )

  it("produces exactly one file in dist-single", () => {
    expect(existsSync(outDir), `expected ${outDir} to exist after the build`)
      .toBe(true)

    const entries = readdirSync(outDir)
    expect(
      entries,
      `expected dist-single to contain exactly one file, found: ${entries.join(", ") || "(empty)"}`,
    ).toHaveLength(1)

    const stats = statSync(path.join(outDir, entries[0]))
    expect(stats.isFile(), `${entries[0]} is not a regular file`).toBe(true)
  })

  it("has no src=/href= pointing at http:, https:, //, or a relative path", () => {
    const [file] = readdirSync(outDir)
    const html = readFileSync(path.join(outDir, file), "utf8")

    // Parse as a DOM (rather than regex-scanning the raw text) so that
    // string literals inside the inlined <script> bundle that merely *look*
    // like `src="..."` (e.g. minified code building an attribute value at
    // runtime) don't produce false positives.
    const dom = new JSDOM(html)
    const offenders: string[] = []
    for (const el of dom.window.document.querySelectorAll("[src], [href]")) {
      for (const attr of ["src", "href"] as const) {
        const value = el.getAttribute(attr)
        if (value != null && !isAllowedReference(value)) {
          offenders.push(`<${el.tagName.toLowerCase()} ${attr}="${value}">`)
        }
      }
    }

    expect(
      offenders,
      `found external/relative reference(s) in the single-file build, which ` +
        `will render a blank iframe under the Studio CSP (connect-src/default-src 'none'): ` +
        offenders.join(", "),
    ).toEqual([])
  })

  it("does not leak MCP_BEARER_TOKEN (name or value) into the HTML", () => {
    const [file] = readdirSync(outDir)
    const html = readFileSync(path.join(outDir, file), "utf8")

    // The env var name itself must never leak, regardless of whether this
    // checkout has a token value configured.
    expect(
      html.includes("MCP_BEARER_TOKEN"),
      "the string 'MCP_BEARER_TOKEN' appears in the built HTML",
    ).toBe(false)

    const tokenValue = findBearerTokenValue()
    if (tokenValue) {
      expect(
        html.includes(tokenValue),
        "the MCP_BEARER_TOKEN value appears in the built HTML",
      ).toBe(false)
    } else {
      // No token reachable from this checkout (no .env, no env var) — still
      // assert something concrete instead of silently no-op'ing, so this
      // branch can't accidentally start passing for the wrong reason.
      expect(tokenValue).toBeUndefined()
    }
  })
})
