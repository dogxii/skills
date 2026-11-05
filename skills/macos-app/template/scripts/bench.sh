#!/bin/bash
# 性能基准：体积、启动到菜单栏图标出现的耗时、内存、CPU 与闲置唤醒，超出预算时失败。
# 预算在下面的 row 调用里，放宽要有理由。
set -euo pipefail
cd "$(dirname "$0")/.."

plist() { /usr/libexec/PlistBuddy -c "Print $1" Support/Info.plist; }
EXE=$(plist CFBundleExecutable)
NAME=$(plist CFBundleName)
APP=build/$NAME.app
BIN=$APP/Contents/MacOS/$EXE
[[ -x $BIN ]] || { echo "请先运行 scripts/build.sh" >&2; exit 1; }

TMP=$(mktemp -d)
RUNNING=0; pgrep -xq "$EXE" && RUNNING=1
pkill -x "$EXE" || true
restore() {
    pkill -x "$EXE" || true
    rm -rf "$TMP"
    if [[ $RUNNING == 1 ]]; then open "$APP"; fi
}
trap restore EXIT
swiftc -O -o "$TMP/launch" scripts/bench/main.swift

FAIL=0
row() {  # 名称 实测 预算 单位
    local mark="✓"
    if (( $(echo "$2 > $3" | bc -l) )); then mark="✗"; FAIL=1; fi
    printf "  %s %7s %-3s  %s（预算 ≤ %s）\n" "$mark" "$2" "$4" "$1" "$3"
}

echo "体积"
row "App" "$(du -sk "$APP" | cut -f1)" 400 KB
row "可执行文件" "$(( $(stat -f%z "$BIN") / 1024 ))" 200 KB
DMG=$(ls build/"$NAME"-*.dmg 2>/dev/null | head -1 || true)
if [[ -n $DMG ]]; then row "DMG" "$(( $(stat -f%z "$DMG") / 1024 ))" 200 KB; fi  # 按字节计：du 会算入 APFS 预分配

echo "启动（到菜单栏图标出现，5 次取中位数）"
TIMES=()
for _ in 1 2 3 4 5; do
    read -r ms pid < <("$TMP/launch" "$BIN")
    TIMES+=("$ms")
    sleep 0.5
    kill "$pid"
    sleep 0.3
done
row "启动耗时" "$(printf '%s\n' "${TIMES[@]}" | sort -n | sed -n 3p)" 120 ms

echo "闲置"
"$BIN" & PID=$!
sleep 3
FOOTPRINT=$(vmmap --summary $PID 2>/dev/null | awk '/Physical footprint:/{print $3; exit}')
STATS=$(top -l 2 -s 10 -pid $PID -stats cpu,idlew 2>/dev/null | tail -1 | tr -d '+')
kill $PID; wait $PID 2>/dev/null || true
row "内存" "${FOOTPRINT%M}" 15 MB
row "CPU" "$(echo "$STATS" | awk '{print $1}')" 0.1 %
row "闲置唤醒（10 秒内）" "$(echo "$STATS" | awk '{print $2}')" 10 次

echo
if [[ $FAIL == 0 ]]; then echo "全部在预算内"; else echo "有指标超出预算"; exit 1; fi
