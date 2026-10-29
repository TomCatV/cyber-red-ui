#!/usr/bin/env node
/**
 * test/run-all.mjs — 一键跑全部测试并汇总
 *
 * 2026-10-29 追加（优化项 5）。
 *
 * 上游 package.json 只有 `check`（语法检查）和 `check:package`（资产计数），
 * 三条真测试要手动一条条跑，其中 music-player-rail.mjs 还依赖 playwright。
 * 这里逐条跑、逐条汇总，并把「环境缺失」和「真失败」分开报：
 * 缺 playwright 时标 SKIP 而不是 FAIL，整个 run 不会因为环境问题全红。
 *
 * 用法：
 *   node test/run-all.mjs
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.dirname(testDir)

const files = fs
  .readdirSync(testDir)
  .filter((f) => f.endsWith('.mjs') && f !== 'run-all.mjs')
  .sort()

/** 缺依赖时的特征串：命中就标 SKIP，不标 FAIL */
const ENV_HINTS = [
  /Cannot find module 'playwright'/,
  /Cannot find module 'react/,
  /Cannot find module 'react-dom/,
  /找不到 playwright/,
  /找不到 react/,
  /Executable doesn't exist.*chromium/i,
  /browserType\.launch/
]

const rows = []
let pass = 0
let fail = 0
let skip = 0

// 先跑语法检查（上游 npm run check）
{
  const targets = ['index.js', 'client.js', 'scripts/prepare-test-deps.mjs']
  const bad = []
  for (const t of targets) {
    const p = path.join(root, t)
    if (!fs.existsSync(p)) continue
    const r = spawnSync(process.execPath, ['--check', p], { encoding: 'utf8' })
    if (r.status !== 0) bad.push(`${t}: ${(r.stderr || '').trim().split('\n')[0]}`)
  }
  rows.push({
    name: '语法检查 (node --check)',
    status: bad.length === 0 ? 'pass' : 'FAIL',
    note: bad.length === 0 ? `${targets.length} 个文件` : bad.join(' | '),
    ms: 0
  })
  if (bad.length === 0) pass += 1
  else fail += 1
}

for (const file of files) {
  const started = Date.now()
  const run = spawnSync(process.execPath, [path.join(testDir, file)], {
    encoding: 'utf8',
    timeout: 300_000,
    cwd: root,
    env: { ...process.env, NO_COLOR: '1' }
  })
  const ms = Date.now() - started
  const out = `${run.stdout || ''}${run.stderr || ''}`
  const envIssue = ENV_HINTS.some((re) => re.test(out))

  let status
  if (run.status === 0) { status = 'pass'; pass += 1 }
  else if (envIssue) { status = 'skip'; skip += 1 }
  else { status = 'FAIL'; fail += 1 }

  const tail = out.trim().split('\n').filter((l) => l.trim()).slice(-1)[0] || ''
  rows.push({
    name: file,
    status,
    note: status === 'pass' ? tail.slice(0, 90)
        : status === 'skip' ? '环境缺失（缺 playwright / react 或浏览器）'
        : (out.trim().split('\n').filter((l) => /AssertionError|Error|✗|not equal/.test(l)).slice(0, 2).join(' | ').slice(0, 140) || `exit ${run.status}`),
    ms
  })
}

const pad = (s, n) => String(s).padEnd(n)
const mark = (s) => (s === 'pass' ? '通过' : s === 'skip' ? '跳过' : '失败')

console.log('')
console.log('  ' + pad('检查项', 40) + pad('结果', 8) + pad('耗时', 10) + '备注')
console.log('  ' + '─'.repeat(96))
for (const r of rows) {
  console.log('  ' + pad(r.name, 40) + pad(mark(r.status), 8) + pad(r.ms ? `${(r.ms / 1000).toFixed(1)}s` : '-', 10) + r.note)
}
console.log('  ' + '─'.repeat(96))
console.log(`  通过 ${pass} · 失败 ${fail} · 跳过 ${skip}（共 ${rows.length} 项）`)

if (skip > 0) {
  console.log('')
  console.log('  跳过项补齐办法：')
  console.log('    node scripts/prepare-test-deps.mjs     # 装 react（music-player-rail 用）')
  console.log('    npm i -D playwright && npx playwright install chromium')
}
console.log('')

process.exit(fail === 0 ? 0 : 1)
