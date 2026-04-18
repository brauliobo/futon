#!/usr/bin/env bash
# Symlinks scripts/hooks/pre-commit into .git/hooks so it runs before
# each commit. Reversible via `rm .git/hooks/pre-commit`.

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

SRC="$REPO_ROOT/scripts/hooks/pre-commit"
DEST="$REPO_ROOT/.git/hooks/pre-commit"

chmod +x "$SRC"
if [ -e "$DEST" ] && [ ! -L "$DEST" ]; then
  echo "! $DEST already exists (not a symlink). Back it up then re-run."
  exit 1
fi
ln -sf "$SRC" "$DEST"
echo "✓ pre-commit hook installed: $DEST → $SRC"
