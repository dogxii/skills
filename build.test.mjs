import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { build, parse } from './build.mjs'

const site = { title: 't', description: 'd' }

function sandbox(skills) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-'))
  for (const [name, frontmatter] of Object.entries(skills)) {
    fs.mkdirSync(path.join(root, 'skills', name), { recursive: true })
    fs.writeFileSync(path.join(root, 'skills', name, 'SKILL.md'), `---\nname: ${name}\n${frontmatter}---\n\nbody-of-${name}\n`)
  }
  return { root, source: path.join(root, 'skills'), out: path.join(root, 'dist') }
}

const everything = (dir) => fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), 'latin1') + entry.name + entry.parentPath)
  .join('\n')

const shown = 'metadata:\n  visibility: public\n'

test('parses frontmatter', () => {
  assert.deepEqual(parse('---\nname: a\ndescription: "b: c"\nmetadata:\n  visibility: unlisted\n---\n'),
    { name: 'a', description: 'b: c', visibility: 'unlisted' })
})

test('private and unmarked skills are never published', () => {
  const box = sandbox({ open: shown, secret: 'metadata:\n  visibility: private\n', unmarked: '' })
  assert.deepEqual(build({ ...box, site }).listed, ['open'])
  const all = everything(box.out)
  assert.ok(all.includes('body-of-open'))
  assert.ok(!all.includes('body-of-secret') && !all.includes('body-of-unmarked'))
})

test('unlisted skills stay out of the list and need a secret', () => {
  const box = sandbox({ quiet: 'metadata:\n  visibility: unlisted\n' })
  assert.deepEqual(build({ ...box, site, secret: undefined }).links, [])
  assert.ok(!everything(box.out).includes('body-of-quiet'))

  const { links } = build({ ...box, site, secret: 's' })
  assert.match(links[0], /^\/u\/[0-9a-f]{32}\/quiet\/$/)
  assert.ok(!fs.readFileSync(path.join(box.out, 'index.html'), 'utf8').includes('quiet'))
  const page = fs.readFileSync(path.join(box.out, links[0], 'index.html'), 'utf8')
  assert.ok(page.includes('noindex') && page.includes('../../../style.css') && !page.includes('全部'))
  assert.deepEqual(build({ ...box, site, secret: 's' }).links, links)  // 地址重建后不变
})

test('zip unpacks with executable scripts, without symlinks or env files', () => {
  const box = sandbox({ kit: shown })
  const dir = path.join(box.source, 'kit')
  fs.mkdirSync(path.join(dir, '资料'))
  fs.writeFileSync(path.join(dir, '资料', '说明.md'), 'hello')
  fs.writeFileSync(path.join(dir, 'run.sh'), '#!/bin/sh\n', { mode: 0o755 })
  fs.writeFileSync(path.join(dir, '.env'), 'TOKEN=leak')
  fs.writeFileSync(path.join(box.root, 'outside.txt'), 'outside-secret')
  fs.symlinkSync(path.join(box.root, 'outside.txt'), path.join(dir, 'link.txt'))
  build({ ...box, site })

  assert.ok(!everything(box.out).includes('leak') && !everything(box.out).includes('outside-secret'))
  const unpacked = path.join(box.root, 'unpacked')
  execFileSync('unzip', ['-q', path.join(box.out, 'kit', 'kit.zip'), '-d', unpacked])
  assert.equal(fs.readFileSync(path.join(unpacked, 'kit', '资料', '说明.md'), 'utf8'), 'hello')
  assert.ok(fs.statSync(path.join(unpacked, 'kit', 'run.sh')).mode & 0o100)
  assert.ok(!fs.existsSync(path.join(unpacked, 'kit', 'link.txt')))
})

test('repository link is optional', () => {
  const box = sandbox({ open: shown })
  build({ ...box, site: { ...site, repository: 'https://example.com/r' } })
  assert.ok(fs.readFileSync(path.join(box.out, 'open', 'index.html'), 'utf8').includes('href="https://example.com/r"'))
  build({ ...box, site })
  assert.ok(!fs.readFileSync(path.join(box.out, 'index.html'), 'utf8').includes('GitHub'))
})

test('page content is escaped and bad names stop the build', () => {
  const box = sandbox({ safe: `description: <img src=x onerror=alert(1)>\n${shown}` })
  build({ ...box, site })
  assert.ok(!fs.readFileSync(path.join(box.out, 'safe', 'index.html'), 'utf8').includes('<img'))

  const bad = sandbox({ Bad_Name: shown })
  assert.throws(() => build({ ...bad, site }), /name/)
})
