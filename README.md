# skills

把 skill 放到网上，用的时候找到它，复制给 AI。不用常驻在本地。

纯静态站点，没有依赖、数据库或账号。

## 用法

```sh
npm run dev     # 构建并打开 http://localhost:4173
npm run build   # 输出到 dist/
npm test
```

把 skill 放进 `skills/<name>/`，在 `SKILL.md` 里写明可见性：

```yaml
---
name: my-skill
description: 这个 skill 做什么，什么时候用。
metadata:
  visibility: public
---
```

| visibility | 效果 |
|---|---|
| `public` | 进列表，地址公开 |
| `unlisted` | 不进列表，用随机地址访问。需要环境变量 `SKILLS_SECRET`，地址在构建时打印 |
| `private` 或不写 | 不发布 |

`unlisted` 不是加密：拿到链接的人和 AI 都能读。源仓库公开时，`unlisted` 和 `private` 的内容也会公开，这时要把仓库设为私有。

## 部署

构建命令 `npm run build`，输出目录 `dist`，Node 22.2+。`_headers` 用于 Cloudflare Pages；其他平台要自行给 `.md` 设 UTF-8 编码。

站点会照原样发布这些文件，AI 也会照着执行。不要发布未经审阅的内容，也不要接受公开投稿。
