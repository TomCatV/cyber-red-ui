#!/usr/bin/env node
/**
 * scripts/prepare-test-deps.mjs — 帮 tests/music-player-rail.mjs 准备好 react
 *
 * 2026-10-29 追加（优化项 3）。
 *
 * 上游 tests/music-player-rail.mjs 用 createRequire 去
 * `<repo>/../music-player-test-runtime/node_modules` 找 react / react-dom，
 * 这个目录只有作者本机存在，clone 下来直接 `node tests/music-player-rail.mjs` 会报：
 *
 *   Error: Cannot find module 'react/package.json'
 *
 * 本脚本把那条依赖就地补齐：在仓库旁建同名目录并装 react@18 + react-dom@18。
 * 装完 music-player-rail.mjs 无需任何环境变量即可跑通。
 *
 * 用法：
 *   node scripts/prepare-test-deps.mjs
 *   node tests/music-player-rail.mjs
 *
 * 如果不想装，也可以自己指定 react 所在目录：
 *   $env:REACT_TEST_MODULE_DIR = "C:\path\to\node_modules"
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const runtimeDir = path.resolve(packageRoot, '../music-player-test-runtime')
const modulesDir = path.join(runtimeDir, 'node_modules')

const has = (name) => fs.existsSync(path.join(modulesDir, name, 'package.json'))

if (has('react') && has('react-dom')) {
  console.log(`[ok] react / react-dom 已就绪：${modulesDir}`)
  console.log('     现在可以跑：node tests/music-player-rail.mjs')
  process.exit(0)
}

console.log(`[*] 目标目录：${runtimeDir}`)
fs.mkdirSync(runtimeDir, { recursive: true })

const pkgFile = path.join(runtimeDir, 'package.json')
if (!fs.existsSync(pkgFile)) {
  fs.writeFileSync(
    pkgFile,
    JSON.stringify({ name: 'music-player-test-runtime', private: true, version: '1.0.0' }, null, 2) + '\n',
    'utf8'
  )
  console.log('[ok] 已写入 package.json')
}

const pnpm = spawnSync('pnpm', ['--version'], { encoding: 'utf8', shell: true })
const npm = spawnSync('npm', ['--version'], { encoding: 'utf8', shell: true })

let cmd, args
if (pnpm.status === 0) {
  cmd = 'pnpm'
  args = ['add', 'react@18', 'react-dom@18']
} else if (npm.status === 0) {
  cmd = 'npm'
  args = ['install', '--no-save', 'react@18', 'react-dom@18']
} else {
  console.error('[x] 既没有 pnpm 也没有 npm，装不了 react。')
  console.error('    手动装好后用环境变量指过去：')
  console.error('    $env:REACT_TEST_MODULE_DIR = "C:\\path\\to\\node_modules"')
  process.exit(1)
}

console.log(`[*] ${cmd} ${args.join(' ')}  (cwd=${runtimeDir})`)
const run = spawnSync(cmd, args, {
  cwd: runtimeDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, pnpm_config_minimum_release_age: '0' }
})

if (run.status !== 0) {
  console.error(`[x] ${cmd} 失败，退出码 ${run.status}`)
  process.exit(run.status ?? 1)
}

if (has('react') && has('react-dom')) {
  console.log('')
  console.log('[ok] 装好了。跑测试：')
  console.log('     node tests/music-player-rail.mjs')
} else {
  console.error('[x] 命令返回 0 但目录里没有 react，检查上面输出')
  process.exit(1)
}
