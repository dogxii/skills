# 发版

## 版本

- 版本写在 `Support/Info.plist`：`CFBundleShortVersionString` 和递增的 `CFBundleVersion`。
- 1.0 之前，新功能升次版本号，修复升修订号。只有一处小修复时，等下次一起发。

## 流程

1. 通过 SKILL.md 的完成标准。
2. `./scripts/build.sh --universal --dmg`，再用 `./scripts/bench.sh` 看 DMG 体积。
3. 提交、推送，再用 `gh release create v<版本> build/<name>-<版本>.dmg --notes-file <说明>`。

提交、推送和发布都要用户确认。宣传素材放进 `.gitignore`，只留在本地。

## 发布说明

先写用户能做什么，不写内部改动。中文在前、英文在后，写清支持的芯片和系统版本。没有公证时说明首次打开要在访达中右键 → 打开。

## README

只保留：一句话定位、截图、安装、它是怎么做的、构建、许可证。操作简单时不写用法。不写夸张的宣传语，写实测数字。
