# cyber-red-ui

面向 DeepSeek Harness 的赛博红控台插件，包含实验状态栏、动态会话背景、播放器和设置页。

## 从 GitHub 安装

```powershell
dsh plugin --profile desktop add github:huzhengcai471-crypto/cyber-red-ui
```

然后在 DSH profile 的 `dsh.profile.bundles` 中加入 `dsh-cyber-red-ui`，重启 DSH。

本项目的媒体、头像和字体资源都随 npm 包分发，插件运行不依赖开发机的绝对路径。仓库当前保持私有，尚未发布 GitHub Release。
