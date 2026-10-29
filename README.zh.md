# cyber-red-ui · 赛博红控台（转载 + 工程优化版）

> **原作者**：[@huzhengcai471-crypto](https://github.com/huzhengcai471-crypto)
> **原作仓库**：<https://github.com/huzhengcai471-crypto/cyber-red-ui>
> **本仓库基线**：上游 `main@d8ba7ac4`，`dsh-cyber-red-ui@1.1.0`
>
> 配色、装饰层、素材、「长征计划」设置页均为原作者作品，逐字节未改。
> 本仓库只做工程层修复，清单见 [OPTIMIZATIONS.md](./OPTIMIZATIONS.md)，署意见 [CREDITS.md](./CREDITS.md)。
>
> **二次开发定制 → QQ：2363984977**

面向 DeepSeek Harness 的赛博红控台插件，包含实验状态栏、动态会话背景、播放器和设置页。

## 安装

### 方式一：PowerShell 安装器（推荐）

```powershell
git clone https://github.com/TomCatV/cyber-red-ui.git
cd cyber-red-ui
pwsh -File .\install.ps1
```

安装器会自动写 `dependencies` 与 `dsh.profile.bundles`、建 `node_modules` 联接点、
并检查是否有其它插件抢同一批宿主槽位。全程幂等。

卸载：

```powershell
pwsh -File .\uninstall.ps1
```

### 方式二：从 GitHub 安装

```powershell
dsh plugin --profile desktop add github:huzhengcai471-crypto/cyber-red-ui
```

然后在 DSH profile 的 `dsh.profile.bundles` 中加入 `dsh-cyber-red-ui`，重启 DSH。

### 方式三：本地 tarball

```powershell
dsh plugin --profile desktop add file:C:/path/to/dsh-cyber-red-ui-1.1.0.tgz
```

同样要手动把 `dsh-cyber-red-ui` 加进 `bundles`。

## 测试

```bash
node tests/run-all.mjs          # 一键跑全部（含语法检查）
node scripts/prepare-test-deps.mjs   # 若 music-player-rail 报缺 react，先跑这个
npm run check:package           # 18 个内置媒体资产完整性
```

## 素材说明

`assets/` 下的视频、音频、头像版权归各自作者所有。按上游 LICENSE 约定，
**仅随本包分发，不单独抽取转载**。需要单独使用请自行取得授权。

本项目的媒体、头像和字体资源都随安装包分发，插件运行不依赖开发机的绝对路径。
GitHub Release 提供完整源码和可直接安装的 `dsh-cyber-red-ui-1.1.0.tgz`。
