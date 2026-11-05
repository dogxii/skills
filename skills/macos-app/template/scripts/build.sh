#!/bin/bash
# 构建 build/<name>.app（默认 Apple Silicon）
#   --universal  同时编译 arm64 与 x86_64（Intel）
#   --dmg        额外生成 build/<name>-<版本>.dmg
set -euo pipefail
cd "$(dirname "$0")/.."

plist() { /usr/libexec/PlistBuddy -c "Print $1" Support/Info.plist; }
BIN=$(plist CFBundleExecutable)
NAME=$(plist CFBundleName)

ARCHS=(arm64)
DMG=0
for arg in "$@"; do
    case "$arg" in
        --universal) ARCHS=(arm64 x86_64) ;;
        --dmg) DMG=1 ;;
        *) echo "未知参数：$arg" >&2; exit 1 ;;
    esac
done

# -Osize 配合链接时优化（LTO）可省约 9% 代码；不需要调试信息
FLAGS=(-c release --experimental-lto-mode=full -Xswiftc -Osize -Xswiftc -gnone)
# 一次编一个架构再合并：同时传两个 --arch 时 SwiftPM 换用 XCBuild，LTO 不生效，每个架构大约 18%
BINS=()
for arch in "${ARCHS[@]}"; do
    swift build "${FLAGS[@]}" --arch "$arch"
    BINS+=("$(swift build "${FLAGS[@]}" --arch "$arch" --show-bin-path)/$BIN")
done

APP=build/$NAME.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
lipo -create "${BINS[@]}" -output "$APP/Contents/MacOS/$BIN"
strip -x "$APP/Contents/MacOS/$BIN"
cp Support/Info.plist "$APP/Contents/"
if [[ -f Support/AppIcon.icns ]]; then cp Support/AppIcon.icns "$APP/Contents/Resources/"; fi
cp -R Support/*.lproj "$APP/Contents/Resources/"
codesign --force --sign - "$APP" 2>/dev/null
codesign --verify --strict "$APP"

echo "$APP  $(du -sh "$APP" | cut -f1)  [$(lipo -archs "$APP/Contents/MacOS/$BIN")]"

if [[ $DMG == 1 ]]; then
    VERSION=$(plist CFBundleShortVersionString)
    STAGE=$(mktemp -d)
    cp -R "$APP" "$STAGE/"
    ln -s /Applications "$STAGE/Applications"
    # HFS+：体积稳定且最小（APFS 会随机多出约 160 KB）
    hdiutil create -quiet -volname "$NAME" -srcfolder "$STAGE" -fs HFS+ -format ULFO -ov "build/$NAME-$VERSION.dmg"
    rm -rf "$STAGE"
    echo "build/$NAME-$VERSION.dmg  $(( $(stat -f%z "build/$NAME-$VERSION.dmg") / 1024 ))K"
fi
