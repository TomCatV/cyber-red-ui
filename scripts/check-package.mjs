import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const fail = (message) => {
  console.error(`FAIL: ${message}`)
  process.exitCode = 1
}

const pkg = JSON.parse(read('package.json'))
if (pkg.name !== 'dsh-cyber-red-ui') fail(`unexpected package name: ${pkg.name}`)
if (pkg.private) fail('package must be installable by other users')
if (!pkg.repository?.url?.includes('huzhengcai471-crypto/cyber-red-ui')) {
  fail('repository URL is not the project repository')
}

for (const rel of ['index.js', 'client.js', 'cordis.patch.yml', 'package.json']) {
  const text = read(rel)
  if (/C:\\\\Users\\\\|C:\/Users\//.test(text)) fail(`machine path leaked into ${rel}`)
  if (text.includes('@local/cyber-red-ui')) fail(`old package name leaked into ${rel}`)
  if (text.includes('\uFFFD')) fail(`replacement character found in ${rel}`)
}

const index = read('index.js')
const client = read('client.js')
const refs = new Set([
  ...[...index.matchAll(/new URL\("\.\/assets\/([^"\\]+)"/g)].map((m) => m[1]),
  ...[...client.matchAll(/\/cyber-red-ui\/(?:video|audio|images)\/([^'"\\]+\.(?:mp4|ogg|flac|wav|gif))/g)].map((m) => m[1]),
])
for (const rel of refs) {
  if (!fs.existsSync(path.join(root, 'assets', rel))) fail(`missing asset: assets/${rel}`)
}

const required = ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'README.md', 'LICENSE']
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) fail(`missing package file: ${rel}`)

if (!client.includes("id: 'dsh-cyber-red-ui'")) fail('client loader id is not package name')
if (!read('cordis.patch.yml').includes("name: 'dsh-cyber-red-ui'")) fail('bundle patch does not target package name')
if (process.exitCode) process.exit()
console.log(`ok: ${refs.size} bundled media assets, ${required.length} required package files`)
