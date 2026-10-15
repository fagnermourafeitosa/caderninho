#!/usr/bin/env bash
# Publish a new Caderninho release on GitHub.
#
#   scripts/release.sh [patch|minor|major|X.Y.Z] [--draft]
#
# Bumps package.json, runs the unit tests, packages the macOS app, zips it,
# commits "release: vX.Y.Z", tags it, pushes main and the tag, and creates the
# GitHub release with the zip attached and notes generated from the commits.
# Nothing is committed or pushed if the tests or the packaging fail.
set -euo pipefail

cd "$(dirname "$0")/.."

bump="patch"; draft=()
for arg in "$@"; do
  case "$arg" in
    --draft) draft=(--draft) ;;
    patch|minor|major) bump="$arg" ;;
    [0-9]*.[0-9]*.[0-9]*) bump="$arg" ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Argumento desconhecido: $arg" >&2; exit 1 ;;
  esac
done

fail() { echo "✗ $*" >&2; exit 1; }

# Node 22+ is required (the default nvm node may be older).
if ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' 2>/dev/null; then
  nvm_node=$(ls -d "$HOME"/.nvm/versions/node/v2[2-9]*/bin 2>/dev/null | sort -V | tail -1)
  [ -n "$nvm_node" ] || fail "Node 22 ou mais novo é necessário."
  export PATH="$nvm_node:$PATH"
fi

[ "$(uname)" = "Darwin" ] || fail "O pacote do app só é gerado no macOS."
command -v gh >/dev/null || fail "Instale o GitHub CLI (gh)."
gh auth status >/dev/null 2>&1 || fail "Faça login com: gh auth login"
[ "$(git branch --show-current)" = "main" ] || fail "Rode a partir da branch main."
[ -z "$(git status --porcelain)" ] || fail "Há mudanças não commitadas."
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "main local difere de origin/main; sincronize antes."

# Until the release commit exists, any exit puts the previous version back.
trap 'echo "✗ Release interrompido; versão restaurada." >&2; git checkout -q -- package.json package-lock.json' EXIT

version=$(npm version "$bump" --no-git-tag-version | sed 's/^v//')
tag="v$version"
git rev-parse -q --verify "refs/tags/$tag" >/dev/null && fail "A tag $tag já existe."
echo "→ Caderninho $tag"

echo "→ Testes"
npm test --silent >/dev/null

echo "→ Empacotando"
npm run package --silent
arch=$(uname -m)
app="dist/Caderninho-darwin-$arch/Caderninho.app"
[ -d "$app" ] || fail "App não encontrado em $app"
zip="dist/Caderninho-$version-mac-$arch.zip"
rm -f "$zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$zip"

trap - EXIT
echo "→ Commit, tag e push"
git add package.json package-lock.json
git commit -q -m "release: $tag"
git tag -a "$tag" -m "Caderninho $tag"
git push -q origin main "$tag"

echo "→ Release no GitHub"
gh release create "$tag" "$zip" --title "Caderninho $tag" --generate-notes ${draft[@]+"${draft[@]}"}
