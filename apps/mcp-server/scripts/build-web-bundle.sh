#!/usr/bin/env bash
# Regenerates apps/mcp-server/Resources/web-app.html from apps/web's
# single-file build. This is the "documented build step" ticket 04 of the
# web-como-view-do-studio spec (issue #7) requires: run this, then rebuild
# the server, whenever apps/web changes and you want the Studio view to
# show the new bundle. There is no hot reload for the Studio view (D7 of
# the spec) — bun dev keeps being how screens are developed day to day.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
web_dir="$repo_root/apps/web"
target="$repo_root/apps/mcp-server/Resources/web-app.html"

(cd "$web_dir" && bun run build:single)

mkdir -p "$(dirname "$target")"
cp "$web_dir/dist-single/index.html" "$target"

echo "Wrote $target ($(wc -c <"$target") bytes)"
