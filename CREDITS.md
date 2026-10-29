# 转载声明 · CREDITS

## 上游原作者

本仓库是**二次转载 + 二次优化版**，全部原始创意、主题配色、装饰层设计、文案与音视频素材的著作权归原作者所有。

| 项目 | 上游仓库 | 上游作者 |
|---|---|---|
| 赛博红控台主题 `dsh-cyber-red-ui` | <https://github.com/huzhengcai471-crypto/cyber-red-ui> | [@huzhengcai471-crypto](https://github.com/huzhengcai471-crypto) |

本仓库锁定的上游基线：

```
repo    huzhengcai471-crypto/cyber-red-ui
branch  main
commit  d8ba7ac4cddaff14c7d44c9f2148109d1a1cf441
subject Release 1.1.0
date    2026-10-25 19:08:48 +0800
version dsh-cyber-red-ui@1.1.0
```

## 我做了什么

**只做工程修复，不改配色、不改装饰层、不改素材、不加功能。**
黑底正红霓虹主题令牌、扫描线叠加、实验状态栏、5 段动态视频壁纸、12 首内置曲目、
「长征计划」设置页的全部行为，均与上游 1.1.0 完全一致，`index.js` / `client.js` 逻辑零改动。

详细对比见 [OPTIMIZATIONS.md](./OPTIMIZATIONS.md)，摘要：

| # | 修复项 | 类型 |
|---|---|---|
| 1 | 新增 `.gitattributes`，锁 LF + 媒体二进制 | 跨平台 |
| 2 | 新增 `.editorconfig` | 跨平台 |
| 3 | `music-player-rail.mjs` 的 react 依赖回落到自动安装 | 测试可跑 |
| 4 | 新增 `install.ps1` / `uninstall.ps1`（含 bundle 冲突检测） | 安装体验 |
| 5 | 新增 `test/run-all.mjs` 一键跑三条测试 | 测试 |
| 6 | README 顶部加转载与优化说明区块 | 文档 |

## 二次开发定制

改配色、换壁纸、加曲目、改状态栏指标源、做企业内网定制、或把这套 UI 接到别的宿主上：

> **QQ：2363984977**

## 许可

上游为 MIT。本仓库继续以 MIT 发布，见 [LICENSE](./LICENSE)。
MIT 允许再分发与修改，唯一硬性要求是保留原始版权声明 —— 本仓库的 `LICENSE` 与本节声明即为此保留。

## 素材权利（重要）

`assets/` 下的视频、FLAC/WAV/OGG 音频与头像 GIP **版权归各自作者所有**，
上游 LICENSE 明确要求：

> Bundled media notice — The artwork, video clips and audio tracks under `assets/`
> are included solely to demonstrate the theme's features. Their copyright belongs
> to the respective authors. Do not redistribute them separately from this package.

本仓库遵循该约定：素材**仅随包随发**，不单独抽取分发。需要单独使用素材请自行取得授权。
