# 转载版 v1.1.0-r1

> 上游：<https://github.com/huzhengcai471-crypto/cyber-red-ui> @ `d8ba7ac4`（v1.1.0）
> 原作者：[@huzhengcai471-crypto](https://github.com/huzhengcai471-crypto)
>
> **本版不包含任何配色、装饰层、素材或交互逻辑的改动。**
> `index.js`、`client.js`、`assets/`（18 个媒体文件 / 77.1 MB）、`locale/*.json`、`icon.svg`、
> `cordis.patch.yml` 全部与上游 v1.1.0 **逐字节一致**（SHA256 已逐个比对）。

## 修复

### 1. 新增 `.gitattributes`（核心）

上游仓库没有这个文件。Windows `core.autocrlf=true` 下 clone 会把 8.8 MB 的 `client.js`
整份转成 CRLF；`assets/` 下的 `mp4 / flac / wav / ogg / gif` 也没有 `binary` 声明，
一旦 Git 把某个媒体误判为 text，素材会被静默改写 —— 这类损坏极难发现。

现在：

```gitattributes
* text=auto eol=lf
*.js *.mjs *.json *.md *.yml *.ps1 *.svg  →  text eol=lf
*.mp4 *.gif *.flac *.wav *.ogg *.mp3 *.png →  binary
```

### 2. 新增 `.editorconfig`

编辑器层钉 LF；并对 `client.js` / `index.js` 关掉「保存时格式化」——
`tests/*.mjs` 大量使用 `source.indexOf` 做字节偏移切片，格式化会让测试错位。

### 3. `tests/music-player-rail.mjs` 依赖解析加回落

上游第 9–14 行写死两条本机路径，其中 `../music-player-test-runtime/node_modules`
**只存在于作者机器**且未被 git 跟踪。clone 下来直接跑必然：

```
Error: Cannot find module 'react/package.json'
Require stack: .../music-player-test-runtime/node_modules/package.json
```

报错完全不提「你缺 react」。现在按 `环境变量 → 约定路径 → 仓库 node_modules` 依次回落，
全不命中时打印**每条尝试路径 + 各自错误码 + 一键修法**。

### 4. 新增 `scripts/prepare-test-deps.mjs`

```bash
node scripts/prepare-test-deps.mjs   # 自动 pnpm / npm，装 react@18 + react-dom@18
node tests/music-player-rail.mjs     # → ok: rail initially open/closed, ...
```

### 5. 新增 `install.ps1` / `uninstall.ps1`

上游要手动改 `dsh.profile.bundles`，漏了就没效果（作者在 README 里专门强调过）。
现在一条命令搞定，并且多了**槽位冲突检测**：扫其它已装插件的 `client.js`，
看是否也注册了 `shell.overlay` / `sidebar.footer.action` / `sidebar.brand.mark` /
`conversation.hero.brand.mark`。同槽位多插件注册不会崩，但会互相覆盖
（表现：装饰层叠层、按钮被顶掉、logo 变成别人的）。

```powershell
pwsh -File .\install.ps1          # 有冲突会列出来并停下
pwsh -File .\install.ps1 -Force   # 无视冲突继续
pwsh -File .\uninstall.ps1
```

### 6. 新增 `tests/run-all.mjs`

```
  检查项                          结果    耗时    备注
  语法检查 (node --check)          通过    -       3 个文件
  music-player-rail.mjs            通过    1.5s
  plan-features.mjs                通过    1.0s
  settings-isolation.mjs           通过    8.0s
  ──────────────────────────────────────────────────────
  通过 4 · 失败 0 · 跳过 0（共 4 项）
```

缺 playwright / react 时标「跳过」而不是「失败」，并打印补齐命令。

### 7. `scripts/check-package.mjs` 断言改造

上游硬编码：

```js
if (!pkg.repository?.url?.includes('huzhengcai471-crypto/cyber-red-ui')) fail(...)
```

这条让**任何 fork 都无法通过自检**。现在改成两条：

1. 仓库 URL 必须是某个 `cyber-red-ui` 仓（允许多点分发）；
2. **`CREDITS.md` 必须存在，且必须引用上游仓库与 MIT 许可证**（新增硬保护，漏署名就 FAIL）。

## 验证

```
node scripts/check-package.mjs  → ok: 18 bundled media assets, 6 required package files
node tests/run-all.mjs          → 通过 4 · 失败 0 · 跳过 0
```

## 安装

```powershell
git clone https://github.com/TomCatV/cyber-red-ui.git
cd cyber-red-ui
pwsh -File .\install.ps1
```

## 素材说明

`assets/` 版权归各自作者所有。按上游 LICENSE 约定，**仅随包分发，不单独抽取转载**。

## 二次开发定制

改配色、换壁纸、加曲目、改状态栏指标源、企业内网适配 → **QQ 2363984977**
