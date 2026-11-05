#!/bin/bash
# 从模板新建项目：new.sh <Name> [目录]，比如 new.sh Kawari ~/Git/kawari
set -euo pipefail
NAME=${1:?用法：new.sh <Name> [目录]}
LOWER=$(echo "$NAME" | tr '[:upper:]' '[:lower:]')
DEST=${2:-$PWD/$LOWER}
[[ ! -e $DEST ]] || { echo "$DEST 已存在" >&2; exit 1; }
cp -R "$(dirname "$0")/../template" "$DEST"
cd "$DEST"
find . -type f -exec grep -lE '__[Aa]pp__' {} + | while read -r f; do
    sed -i '' "s/__App__/$NAME/g; s/__app__/$LOWER/g" "$f"
done
find . -depth -name '*__App__*' | while read -r p; do
    base=$(basename "$p")
    mv "$p" "$(dirname "$p")/${base//__App__/$NAME}"
done
echo "$DEST"
