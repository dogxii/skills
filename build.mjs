// 把 skills/ 构建成纯静态站点 dist/。没有依赖。
//   public    进列表，地址公开
//   unlisted  不进列表，地址由 SKILLS_SECRET 算出；没有密钥就不发布
//   private   不发布；没写 visibility 时也按这个处理，忘了写不会泄露
import { createHmac } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { crc32, deflateRawSync } from 'node:zlib'

const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** frontmatter 里用到的三个字段；visibility 放在 metadata 下，不破坏 SKILL.md 的通用格式 */
export function parse(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
  const field = (key) =>
    block.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^(['"])(.*)\1$/, '$2')
  return { name: field('name'), description: field('description') ?? '', visibility: field('visibility') ?? 'private' }
}

/** 目录下要发布的文件（相对路径）。跳过软链接，免得把目录外的内容带出去 */
function files(dir, prefix = '') {
  return fs.readdirSync(path.join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name)
    if (entry.name === '.DS_Store' || entry.name.startsWith('.env')) return []
    if (entry.isDirectory()) return files(dir, relative)
    return entry.isFile() ? [relative] : []
  }).sort()
}

/** 最小的 zip 写入器：部署环境不一定有 zip 命令。保留可执行权限，脚本解压后能直接运行 */
function zip(entries) {
  const locals = [], centrals = []
  let offset = 0
  for (const { name, data, mode } of entries) {
    const packed = deflateRawSync(data), title = Buffer.from(name)
    const shared = Buffer.alloc(26)
    shared.writeUInt16LE(20, 0)            // 解压所需版本
    shared.writeUInt16LE(0x0800, 2)        // 文件名是 UTF-8
    shared.writeUInt16LE(8, 4)             // deflate
    shared.writeUInt16LE(0x5821, 8)        // 固定日期，内容不变时 zip 也不变
    shared.writeUInt32LE(crc32(data), 10)
    shared.writeUInt32LE(packed.length, 14)
    shared.writeUInt32LE(data.length, 18)
    shared.writeUInt16LE(title.length, 22)
    const local = Buffer.concat([Buffer.from('PK\x03\x04', 'latin1'), shared, title, packed])
    const tail = Buffer.alloc(14)
    tail.writeUInt32LE(((0o100000 | mode) << 16) >>> 0, 6)  // Unix 权限
    tail.writeUInt32LE(offset, 10)
    centrals.push(Buffer.concat([
      Buffer.from('PK\x01\x02', 'latin1'), Buffer.from([20, 3]), shared, tail, title,
    ]))
    locals.push(local)
    offset += local.length
  }
  const directory = Buffer.concat(centrals), end = Buffer.alloc(22)
  end.write('PK\x05\x06', 0, 'latin1')
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

const style = `
:root {
  color-scheme: light dark;
  --bg: #fbfbfd; --surface: #fff; --text: #1d1d1f; --muted: #6e6e73; --line: #e3e3e8;
  --accent: #5856d6; --on-accent: #fff; --code: #f4f4f7;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161618; --surface: #1f1f22; --text: #f5f5f7; --muted: #a1a1a6; --line: #333337;
    --accent: #8583ff; --on-accent: #111; --code: #1b1b1e;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
}
main { position: relative; max-width: 720px; margin: 0 auto; padding: 56px 16px 80px; }
.source { position: absolute; top: 58px; right: 16px; color: var(--muted); font-size: 14px; text-decoration: none; }
.source:hover { color: var(--text); }
h1 { margin: 0; padding-right: 64px; font-size: 30px; line-height: 1.25; letter-spacing: -.01em; overflow-wrap: anywhere; }
h2 { margin: 40px 0 12px; font-size: 14px; color: var(--muted); font-weight: 600; }
a { color: inherit; }
.lead { margin: 8px 0 0; color: var(--muted); }
.back { display: inline-block; margin-bottom: 24px; color: var(--muted); font-size: 14px; text-decoration: none; }
.back:hover { color: var(--text); }
input {
  width: 100%; margin-top: 28px; padding: 11px 14px; font: inherit; color: inherit;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
}
input:focus, button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.list { list-style: none; margin: 20px 0 0; padding: 0; border-top: 1px solid var(--line); }
.list a { display: block; padding: 16px 0; border-bottom: 1px solid var(--line); text-decoration: none; }
.list a:hover strong { color: var(--accent); }
.list strong { font-weight: 600; }
.list span { display: block; color: var(--muted); font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
button, .button {
  padding: 9px 15px; font: inherit; font-size: 14px; font-weight: 500; line-height: 1.5; color: var(--text);
  background: var(--surface); border: 1px solid var(--line); border-radius: 9px; cursor: pointer; text-decoration: none;
}
button:hover, .button:hover { border-color: var(--muted); }
.primary, .primary:hover { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }
.files { margin: 0; padding: 0; list-style: none; font-size: 14px; }
.files a { color: var(--muted); }
.files a:hover { color: var(--text); }
pre {
  margin: 0; padding: 16px; overflow-x: auto; font: 13px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap; overflow-wrap: anywhere; background: var(--code); border: 1px solid var(--line); border-radius: 10px;
}
.empty { margin-top: 24px; color: var(--muted); }
`

const page = (site, title, body, { depth = 0, hidden = false } = {}) => `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
${hidden ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<title>${escape(title)}</title>
<link rel="stylesheet" href="${'../'.repeat(depth)}style.css">
</head>
<body><main>${site.repository ? `<a class="source" href="${escape(site.repository)}">GitHub</a>` : ''}${body}</main></body>
</html>
`

const home = (site, skills) => page(site, site.title, `
<h1>${escape(site.title)}</h1>
<p class="lead">${escape(site.description)}</p>
<input id="search" type="search" placeholder="搜索" aria-label="搜索 skill" autocomplete="off">
<ul class="list" id="list">${skills.map((skill) => `
<li data-text="${escape(`${skill.name} ${skill.description}`.toLowerCase())}"><a href="${skill.name}/"><strong>${escape(skill.name)}</strong><span>${escape(skill.description)}</span></a></li>`).join('')}
</ul>
<p class="empty" id="empty" hidden>没有找到</p>
<script>
const items = [...document.querySelectorAll('#list li')], empty = document.getElementById('empty')
document.getElementById('search').addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase()
  let shown = 0
  for (const item of items) {
    item.hidden = !item.dataset.text.includes(query)
    if (!item.hidden) shown++
  }
  empty.hidden = shown > 0
})
</script>`)

const detail = (site, skill, list, text, hidden) => {
  const extras = list.length > 1
  return page(site, skill.name, `
${hidden ? '' : '<a class="back" href="../">← 全部</a>'}
<h1>${escape(skill.name)}</h1>
<p class="lead">${escape(skill.description)}</p>
<div class="actions">
<button class="primary" id="ai">复制给 AI</button>
<button id="full">复制全文</button>
${extras ? `<a class="button" href="${skill.name}.zip" download>下载 zip</a>` : ''}
</div>
<h2>SKILL.md</h2>
<pre id="source">${escape(text)}</pre>
${extras ? `<h2>文件</h2>
<ul class="files">${list.map((file) => `<li><a href="${escape(file)}">${escape(file)}</a></li>`).join('')}</ul>` : ''}
<script>
const base = location.href.split(/[?#]/)[0].replace(/[^/]*$/, '')
const prompt = \`读取 \${base}SKILL.md 的原文并按它执行。${extras ? '它提到的其他文件在同一路径下；要在本地运行模板或脚本时，下载 ${base}' + skill.name + '.zip。' : ''}\`
async function copy(button, text) {
  const label = button.textContent
  await navigator.clipboard.writeText(text)
  button.textContent = '已复制'
  setTimeout(() => { button.textContent = label }, 1500)
}
document.getElementById('ai').onclick = (event) => copy(event.target, prompt)
document.getElementById('full').onclick = (event) => copy(event.target, document.getElementById('source').textContent)
</script>`, { depth: hidden ? 3 : 1, hidden })
}

export function build({ source = 'skills', out = 'dist', secret = process.env.SKILLS_SECRET, site = JSON.parse(fs.readFileSync('site.json', 'utf8')) } = {}) {
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(path.join(out, 'style.css'), style.trimStart())

  const listed = [], links = [], headers = ['/u/*\n  X-Robots-Tag: noindex\n']
  for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue
    const dir = path.join(source, entry.name), file = path.join(dir, 'SKILL.md')
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8'), skill = parse(text)
    if (skill.name !== entry.name || !/^[a-z0-9-]+$/.test(entry.name)) {
      throw new Error(`${file}：name 要和目录名相同，只用小写字母、数字和连字符`)
    }
    if (!['public', 'unlisted', 'private'].includes(skill.visibility)) throw new Error(`${file}：未知的 visibility`)
    if (skill.visibility === 'private') continue
    const hidden = skill.visibility === 'unlisted'
    if (hidden && !secret) {
      console.warn(`跳过 ${skill.name}：unlisted 需要 SKILLS_SECRET`)
      continue
    }
    const route = hidden
      ? `u/${createHmac('sha256', secret).update(skill.name).digest('hex').slice(0, 32)}/${skill.name}`
      : skill.name
    const target = path.join(out, route), list = files(dir)
    for (const relative of list) {
      fs.mkdirSync(path.dirname(path.join(target, relative)), { recursive: true })
      fs.copyFileSync(path.join(dir, relative), path.join(target, relative))
    }
    if (list.length > 1) {
      fs.writeFileSync(path.join(target, `${skill.name}.zip`), zip(list.map((relative) => ({
        name: `${skill.name}/${relative}`,
        data: fs.readFileSync(path.join(dir, relative)),
        mode: fs.statSync(path.join(dir, relative)).mode & 0o777,
      }))))
    }
    fs.writeFileSync(path.join(target, 'index.html'), detail(site, skill, list, text, hidden))
    headers.push(`/${route}/SKILL.md\n  Content-Type: text/plain; charset=utf-8\n`)
    if (hidden) links.push(`/${route}/`)
    else listed.push(skill)
  }
  fs.writeFileSync(path.join(out, 'index.html'), home(site, listed))
  fs.writeFileSync(path.join(out, '_headers'), headers.join('\n'))
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /u/\n')
  return { listed: listed.map((skill) => skill.name), links }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { listed, links } = build()
  console.log(`dist/  ${listed.length} 个公开 skill`)
  for (const link of links) console.log(`不公开：${link}`)
}
