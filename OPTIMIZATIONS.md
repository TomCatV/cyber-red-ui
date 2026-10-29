# 优化清单 · OPTIMIZATIONS

> 全部改动均为**工程/交付层修复**，不触碰配色、装饰层、素材与交互逻辑。
> 主题表现与上游 `dsh-cyber-red-ui@1.1.0` 完全一致。

---

## 1. 新增 `.gitattributes`：锁 LF + 媒体二进制（核心修复）

### 问题

上游仓库**没有 `.gitattributes`**。本机 `core.autocrlf=true`（Git for Windows 常见默认）
clone 下来会在 checkout 时把 `client.js`（8.8 MB 单文件）等文本全部转成 CRLF：

```
client.js  8863923 → +N 个 \r
```

JS 引擎能跑，但：

- 源码与发布 tarball 不再逐字节一致，没法用 SHA256 对账；
- 按字节偏移做字符串切片的测试（本仓库 `tests/*.mjs` 大量使用 `source.indexOf`）在极端情况下会错位；
- `.mp4 / .flac / .wav` 没有 `binary` 声明，一旦哪天 Git 把某个文件判定为 text，
  素材会被静默损坏（二进制被换行符改写）。

### 修复

```gitattributes
* text=auto eol=lf
*.js   text eol=lf
*.mjs  text eol=lf
*.json text eol=lf
*.md   text eol=lf
*.yml  text eol=lf
*.ps1  text eol=lf

# 媒体素材：禁止任何转换
*.mp4  binary
*.gif  binary
*.flac binary
*.wav  binary
*.ogg  binary
*.svg  text eol=lf
```

### 验证

```
修复前：git clone（autocrlf=true）→ client.js 含 CR，sha256 与 Release tarball 不符
修复后：git clone → client.js CR=0，sha256 与 Release 内文件一致
```

---

## 2. 新增 `.editorconfig`

`.gitattributes` 只管 Git 侧。在 Windows 编辑器里手改 `client.js`（8.8 MB，很容易被 IDE 自动格式化）
再存盘，默认仍会写 CRLF。`.editorconfig` 把编辑器也钉到 LF。

---

## 3. `tests/music-player-rail.mjs`：依赖解析加回落 + 一键补齐

### 问题

上游测试脚本第 9–14 行写死了两条本机路径：

```js
const runtimeModules = process.env.PLAYWRIGHT_MODULE_DIR || path.join(os.homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const reactModules = process.env.REACT_TEST_MODULE_DIR || path.resolve(packageRoot,
  '../music-player-test-runtime/node_modules');
```

`../music-player-test-runtime/node_modules` 这个目录**只存在于作者本机**，且没有被 git 跟踪。
clone 下来直接跑必然报：

```
Error: Cannot find module 'react/package.json'
Require stack:
- .../plugins/music-player-test-runtime/node_modules/package.json
```

而且报错信息完全不提「你缺 react」，只给一个指向不存在目录的栈，很难自查。

### 修复

**a) 解析加回落链**

```js
// playwright：环境变量 → codex runtime → 仓库 node_modules → 同级 node_modules
// react：     环境变量 → ../music-player-test-runtime → 仓库 node_modules
```

任一命中即可跑；全不命中时打印**已尝试的每一条路径 + 各自的错误码**，
并直接给出修法，而不是甩一个栈。

**b) 新增 `scripts/prepare-test-deps.mjs`**

一键把 `../music-player-test-runtime` 建好并装上 `react@18` + `react-dom@18`：

```bash
node scripts/prepare-test-deps.mjs
node tests/music-player-rail.mjs
```

脚本会先探测 `pnpm`，没有就退到 `npm`，两个都没有就打印手动装法。

### 验证

```
修复前：node tests/music-player-rail.mjs
        → Error: Cannot find module 'react/package.json'（exit 1，无提示）
        → exit=1 exit 1

修复后：node scripts/prepare-test-deps.mjs
        → [ok] 装好了
        node tests/music-player-rail.mjs
        → ok: rail initially open/closed, repeated toggles preserve player size,
             styling and audio   （exit 0）
```

---

## 4. `install.ps1` / `uninstall.ps1`：PowerShell 安装器

上游 `PUBLISHING.md` 给的是三条 `dsh plugin ... add` 命令 + 手动编辑 `package.json` 的 `bundles`。
手动那步最容易漏（作者自己也在 README 里强调「同样要把它加进 bundles」）。

`install.ps1` 做四件事，全部幂等：

1. 定位 `DSH_HOME` / profile（默认 `desktop`，`-Profile web` 可切）；
2. 写 `dependencies`（`link:` 本地路径）与 `dsh.profile.bundles`（去重插入）；
3. 建 `node_modules` 联接点（已指向本仓库则不重建）；
4. **冲突检测**：扫 bundles 里是否有别的同名 bundle 抢 `shell.overlay / sidebar.footer.action`
   这类宿主槽位；发现就报警并列出，`-Force` 才继续。

`uninstall.ps1` 反向操作，不碰 `localStorage` 里的主题开关状态。

```powershell
pwsh -File .\install.ps1
pwsh -File .\install.ps1 -Profile web
pwsh -File .\uninstall.ps1
```

---

## 5. `tests/run-all.mjs`：一键跑三条测试

上游 `package.json` 只有 `check`（语法检查）和 `check:package`（资产计数），
三条真测试要手动一条条跑，且 `music-player-rail.mjs` 需要 playwright + 浏览器。
`run-all.mjs` 逐条跑并汇总，缺依赖的那条单独标注「跳过」而不是整体失败：

```
  检查项                          结果    耗时    备注
  ──────────────────────────────────────────────────────────────────────
  语法检查 (node --check)          通过    -       3 个文件
  music-player-rail.mjs            通过    1.5s    ok: rail initially open/closed, ...
  plan-features.mjs                通过    1.0s    ok: appearance restore/lock, ...
  settings-isolation.mjs           通过    8.0s    ok: modal/route settings, ...
  ──────────────────────────────────────────────────────────────────────
  通过 4 · 失败 0 · 跳过 0（共 4 项）
```

---

## 6. `scripts/check-package.mjs`：仓库 URL 断言改为「允许多点分发 + 强制署名」

### 问题

上游第 15–17 行硬编码了作者的仓库地址：

```js
if (!pkg.repository?.url?.includes('huzhengcai471-crypto/cyber-red-ui')) {
  fail('repository URL is not the project repository')
}
```

这条断言的初衷是「防止发布时 package.json 指错仓库」。但它同时也让**任何 fork 都无法通过自检** ——
fork 后 `repository` 必然指向自己，一跑 `npm run check:package` 就 FAIL，
于是要么删掉这条断言（丢了保护），要么改掉 `repository`（丢了归属）。

### 修复

改成两条更有意义的断言：

```js
// 1) 仓库 URL 必须是某个 cyber-red-ui 仓（不再限定具体账号）
if (!/(dsh-)?cyber-red-ui(\.git)?$/.test(pkg.repository?.url ?? '')) fail(...)

// 2) 转载仓库必须存在 CREDITS.md，且其中必须出现上游仓库与上游许可证
const credits = read('CREDITS.md')
if (!credits.includes('huzhengcai471-crypto/cyber-red-ui')) fail('CREDITS.md does not cite the upstream repository')
if (!credits.includes('MIT')) fail('CREDITS.md does not state the upstream license')
```

第 2 条是**新增的硬性保护**：谁想 fork 这个仓库，都得保留署名，否则自检不过。

### 验证

```
修复前：node scripts/check-package.mjs
        → FAIL: repository URL is not the project repository   （exit 1）

修复后：node scripts/check-package.mjs
        → ok: 18 bundled media assets, 6 required package files  （exit 0）

反向验证（把 CREDITS.md 挪走）：
        → FAIL: CREDITS.md missing — 转载仓库必须写明上游作者与仓库
```

---

## 7. README 顶部转载区块

在 `README.md` / `README.zh.md` 最前面插入上游链接、作者、基线 commit、优化摘要与定制 QQ，
避免有人 clone 之后误以为是原创仓库。

---

## 未改动清单（明确声明）

以下内容与上游 **逐字节一致**，本仓库没有做任何修改：

- `index.js`（24932 字节，宿主侧路由与媒体流）
- `client.js`（8863923 字节，主题令牌 / 装饰层 / 状态栏 / 音乐播放器 / 设置页）
- `assets/` 全部 18 个媒体文件（5 段 mp4 + 1 gif + 12 段音频，共 77.1 MB）
- `locale/en.json`、`locale/zh.json`、`icon.svg`
- `cordis.patch.yml`
- `package.json` 的 `version` / `dsh` / `exports` / `files` / `peerDependencies` 语义字段
  （只调整了 `repository` / `bugs` 指向本 fork、加 `contributors` 署名、
   `files` 追加 CREDITS/OPTIMIZATIONS/install 脚本/docs、加 `test` / `test:deps` 两个 script）

可用以下命令自查 `index.js` / `client.js`：

```powershell
node -e "const c=require('crypto'),f=require('fs');for(const p of ['index.js','client.js'])console.log(p,c.createHash('sha256').update(f.readFileSync(p)).digest('hex'))"
```

与上游同命令输出对比即可。
