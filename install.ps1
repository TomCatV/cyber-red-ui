#Requires -Version 7.0
<#
.SYNOPSIS
    dsh-cyber-red-ui（赛博红控台）安装器

.DESCRIPTION
    把本仓库作为 DSH 主题插件装进指定 profile。全程幂等，重复执行不会重复插入。

    与上游 README 的三步法（dsh plugin add + 手改 bundles + 重启）相比多做四件事：
      1. 定位 DSH_HOME / profile，找不到就说清缺什么；
      2. 自动写 dependencies 与 dsh.profile.bundles（上游要手动改 JSON）；
      3. 建 node_modules 联接点，指向本仓库；
      4. 扫描其它已装插件的 client.js，检查是否抢同一个宿主槽位。

    第 4 条是实测出来的需求：本插件注册了 shell.overlay（两次）、
    sidebar.footer.action（两次）、sidebar.brand.mark、conversation.hero.brand.mark。
    同一槽位上多个插件同时注册不会崩，但会互相覆盖/叠层，
    表现是装饰层错位或按钮消失。这层检查会把这些情况提前指出来。

.PARAMETER Profile
    DSH profile 名，默认 desktop（桌面端）。

.PARAMETER Force
    检测到槽位冲突时仍然继续安装。

.PARAMETER SkipInstall
    跳过 pnpm lockfile 校验。

.EXAMPLE
    pwsh -File .\install.ps1

.EXAMPLE
    pwsh -File .\install.ps1 -Force
#>
[CmdletBinding()]
param(
    [string]$Profile = 'desktop',
    [switch]$Force,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$PackageName = 'dsh-cyber-red-ui'
$RepoRoot    = $PSScriptRoot

# 本插件占用的宿主槽位（用于冲突检测）
#
# 注意：settings.section 是**叠加型**槽位 —— 每个插件各占一个分组是正常用法
# （启动动画 order 26、本插件 order 13 并存完全没问题），所以它不在检测范围内。
# 下面这几个才是单占型：同一槽位多插件注册会互相顶掉。
$OwnSlots = @(
    'shell.overlay',
    'sidebar.footer.action',
    'sidebar.brand.mark',
    'conversation.hero.brand.mark'
)

function Say  ($m) { Write-Host "[*] $m" }
function Good ($m) { Write-Host "[ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "[!] $m"  -ForegroundColor Yellow }
function Die  ($m) { Write-Host "[x] $m"   -ForegroundColor Red; exit 1 }

# ── 1. 定位 DSH ─────────────────────────────────────────────────────────
$DshHome = $env:DSH_HOME
if (-not $DshHome) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }
if (-not (Test-Path $DshHome)) { Die "找不到 DSH 目录：$DshHome" }
Say "DSH_HOME = $DshHome"

$ProfileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path $ProfileDir)) {
    $avail = Get-ChildItem (Join-Path $DshHome 'profiles') -Directory -ErrorAction SilentlyContinue |
             Select-Object -ExpandProperty Name
    Die "profile '$Profile' 不存在。现有：$($avail -join ', ')"
}
$PkgJson = Join-Path $ProfileDir 'package.json'
if (-not (Test-Path $PkgJson)) { Die "profile 缺少 package.json：$PkgJson" }
Say "profile 目录 = $ProfileDir"

# ── 2. Node 版本（engines: ^22.15.0 || >=24）─────────────────────────────
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $v = (& node -p 'process.versions.node')
    $major = [int]($v.Split('.')[0])
    $minor = [int]($v.Split('.')[1])
    $okNode = ($major -eq 22 -and $minor -ge 15) -or ($major -ge 24)
    if ($okNode) { Good "Node v$v（满足 ^22.15.0 || >=24）" }
    else { Warn "Node v$v 不满足 engines: ^22.15.0 || >=24（不影响协议，但遇到怪异行为先怀疑它）" }
} else {
    Warn 'PATH 里没有 node'
}

# ── 3. 槽位冲突检测 ─────────────────────────────────────────────────────
$pkg     = Get-Content $PkgJson -Raw | ConvertFrom-Json
$bundles = @($pkg.dsh.profile.bundles)
$nm      = Join-Path $ProfileDir 'node_modules'

Say '检查宿主槽位冲突 ...'
$conflicts = @()
foreach ($b in $bundles) {
    if ($b -eq $PackageName) { continue }
    if ($b -like '@deepseek-ai/*') { continue }   # 官方包不查

    # 包名可能带 scope，路径要拆
    $dir = Join-Path $nm ($b -replace '/', '\')
    if (-not (Test-Path $dir)) { continue }

    # 找它的客户端入口（client.js / dsh.client 声明）
    $clientFiles = @()
    foreach ($cand in 'client.js', 'lib\client.js', 'dist\client.js') {
        $p = Join-Path $dir $cand
        if (Test-Path $p) { $clientFiles += $p }
    }
    if ($clientFiles.Count -eq 0) { continue }

    foreach ($cf in $clientFiles) {
        $text = Get-Content $cf -Raw -ErrorAction SilentlyContinue
        if (-not $text) { continue }
        foreach ($slot in $OwnSlots) {
            # 只看「注册」动作，不看注释/字符串提及
            if ($text -match "slots\.register\(\s*\{[^}]*name:\s*['""]$([regex]::Escape($slot))['""]") {
                $conflicts += [pscustomobject]@{ Plugin = $b; Slot = $slot; File = (Split-Path $cf -Leaf) }
            }
        }
    }
}

if ($conflicts.Count -gt 0) {
    Warn "检测到 $($conflicts.Count) 处槽位重叠："
    $conflicts | Group-Object Slot | ForEach-Object {
        $others = ($_.Group.Plugin | Select-Object -Unique) -join ', '
        Warn "  $($_.Name)  ←  $others"
    }
    Warn '同一槽位多插件注册不会崩溃，但会互相覆盖：装饰层可能叠层、按钮可能被顶掉。'
    Warn '本插件的 BrandMark 用的是 priority:-100（单槽位升序，负数才压得过官方 0），'
    Warn '若另一个插件也用负数，谁的优先级更小谁赢 —— 表现是 logo 变成别人的。'
    if (-not $Force) {
        Write-Host ''
        Warn '加 -Force 继续安装：'
        Warn '  pwsh -File .\install.ps1 -Force'
        exit 3
    }
    Warn '按 -Force 继续。'
} else {
    Good '无槽位冲突'
}

# ── 4. 写 dependencies + bundles ────────────────────────────────────────
$linkSpec = 'link:' + ($RepoRoot -replace '\\', '/')
if ($null -eq $pkg.dependencies.$PackageName) {
    $pkg.dependencies | Add-Member -NotePropertyName $PackageName -NotePropertyValue $linkSpec -Force
    Say "dependencies += $PackageName"
} else {
    $pkg.dependencies.$PackageName = $linkSpec
    Say "dependencies 已更新 $PackageName"
}

$cur = @($pkg.dsh.profile.bundles)
if ($cur -notcontains $PackageName) {
    # 放在 dsh-web-app 之后、其它视觉插件之前：主题令牌要早于消费它的组件
    $idx = [Array]::IndexOf($cur, '@deepseek-ai/dsh-web-app')
    if ($idx -lt 0) {
        $pkg.dsh.profile.bundles = @($cur + $PackageName)
    } else {
        $pkg.dsh.profile.bundles = @($cur[0..$idx]) + $PackageName + @($cur[($idx + 1)..($cur.Count - 1)])
    }
    Good "bundles += $PackageName"
} else {
    Say "bundles 里已存在 $PackageName，跳过"
}

$pkg | ConvertTo-Json -Depth 64 | Set-Content $PkgJson -Encoding utf8
Good "已写入 $PkgJson"

# ── 5. 联接点 ───────────────────────────────────────────────────────────
if (-not (Test-Path $nm)) { New-Item -ItemType Directory -Force $nm | Out-Null }
$link = Join-Path $nm $PackageName

if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.LinkType) {
        $curTarget = $null
        try { $curTarget = (Resolve-Path $item.Target -ErrorAction Stop).Path } catch { $curTarget = $null }
        $wantTarget = (Resolve-Path $RepoRoot -ErrorAction Stop).Path
        if ($curTarget -ne $wantTarget) {
            $item.Delete(); Say "旧联接点指向 $curTarget，已删除重建"
        } else {
            Say '联接点已指向本仓库，无需重建'
        }
    } else {
        Die "$link 是实体目录（不是联接点）。先删掉它再装，否则会用到旧副本。"
    }
}
if (-not (Test-Path $link)) {
    cmd /c mklink /J "$link" "$RepoRoot" | Out-Null
    if ($LASTEXITCODE -ne 0) { Die "创建联接点失败：$link -> $RepoRoot" }
    Good "联接点 node_modules\$PackageName -> $RepoRoot"
}

# ── 6. 资产完整性 ───────────────────────────────────────────────────────
$assets = Join-Path $RepoRoot 'assets'
if (Test-Path $assets) {
    $files = Get-ChildItem $assets -File
    $mb = [math]::Round((($files | Measure-Object Length -Sum).Sum / 1MB), 1)
    if ($files.Count -eq 18) { Good "内置媒体 $($files.Count) 个 / $mb MB（与 package.json files 声明一致）" }
    else { Warn "内置媒体 $($files.Count) 个 / $mb MB —— 预期 18 个，可能 clone 不全（建议用仓库压缩包而不是稀疏 clone）" }
} else {
    Warn '缺少 assets/ 目录：壁纸与音乐会 404，主题其余部分照常'
}

# ── 7. lockfile 校验（可选）──────────────────────────────────────────────
if (-not $SkipInstall) {
    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpm) {
        Say 'pnpm install --lockfile-only ...'
        Push-Location $ProfileDir
        try {
            $env:pnpm_config_minimum_release_age = '0'
            & pnpm install --lockfile-only --ignore-scripts 2>&1 | Select-Object -Last 4 | ForEach-Object { "    $_" }
        } finally { Pop-Location }
        Good 'lockfile 校验完成'
    } else {
        Warn '未找到 pnpm，跳过'
    }
}

# ── 8. 收尾 ─────────────────────────────────────────────────────────────
Write-Host ''
Good '安装完成。'
Write-Host ''
Write-Host '下一步：' -ForegroundColor Cyan
Write-Host '  1. 完全退出 DSH 后重新启动（只刷新页面不够，bundle 层要重算）'
Write-Host '  2. 刷新界面 → 左下角出现「实验状态」按钮、「播放」条'
Write-Host '  3. 设置 → 长征计划（order 13）：主开关、文案、壁纸、亮度、音轨'
Write-Host ''
Write-Host '关闭主题：长征计划页顶部主开关，或清 Local Storage 的 cr-plan-enabled' -ForegroundColor Cyan
Write-Host ''
Write-Host '二次开发定制 · QQ 2363984977' -ForegroundColor Magenta
