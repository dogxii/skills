---
name: macos-app
description: 做小而快的原生 macOS App（菜单栏工具、桌面小工具）。新建、修改、验证或发布这类 Swift/AppKit 项目时使用。
metadata:
  visibility: public
---

# macOS 小工具

目标：小、快、安静、优雅。每个功能先问：不做行不行。

## 默认

- Swift 6、AppKit、SwiftPM，macOS 14+，零第三方依赖。不用 SwiftUI、Electron 或 Xcode 工程。
- 窗口和面板第一次打开时才创建。
- 闲置时不轮询：靠文件监听、系统通知和到点定时器。
- 不联网、不自动更新、不收集数据，除非这就是产品本身。
- 只用官方机制。改动用户的配置时只动自己那一段，并且能完整还原。
- 界面文字用 `String(localized:)`，中文作 key，英文放 `en.lproj`。

## 开始

```sh
<skill 目录>/scripts/new.sh <Name> [目录]
```

项目的 `CLAUDE.md` 只写定位和预算例外，通用规则留在这里。

## 完成标准

全部做到才算完成：

1. `swift test` 通过。新逻辑放在不依赖 AppKit 的类型里，方便测试。
2. `./scripts/build.sh && ./scripts/bench.sh` 不超预算。放宽预算要说明理由，不要改测量逻辑。
3. 运行真实 App 并截图，看过浅色、深色，以及半透明面板背后是深色内容的情况。渲染的快照不能代替这一步。
4. 走过边界情况：文件缺失、权限不足、首次启动、App 没在运行。
5. 再读一遍改动，删掉绕弯和冗余的代码。

## 按需阅读

- 做界面前：[references/design.md](references/design.md)
- 写界面、命令行、文件监听或构建脚本前：[references/pitfalls.md](references/pitfalls.md)
- 发版、写 README 前：[references/release.md](references/release.md)
- 面板对照图和图标脚本的写法：参考 [kawari](https://github.com/dogxii/kawari) 的 `scripts/snapshot` 与 `scripts/icon`

踩到新坑时，把它加进 `pitfalls.md`。
