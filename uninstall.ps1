#Requires -Version 7.0
<#
.SYNOPSIS
    卸载 dsh-cyber-red-ui（赛博红控台）

.DESCRIPTION
    从 profile 移除本插件。默认**不清理浏览器 localStorage** —— 重装后
    「长征计划」的主开关状态、壁纸选择、音轨选择都还在。
    加 -ResetClientState 会打印清理指引（localStorage 只能从浏览器侧清）。

.EXAMPLE
    pwsh -File .\uninstall.ps1
#>
[CmdletBinding()]
param(
    [string]$Profile = 'desktop',
    [switch]$ResetClientState
)

$ErrorActionPreference = 'Stop'
$PackageName = 'dsh-cyber-red-ui'

function Say  ($m) { Write-Host "[*] $m" }
function Good ($m) { Write-Host "[ok] $m" -ForegroundColor Green }
function Warn ($m) { Write-Host "[!] $m"  -ForegroundColor Yellow }

$DshHome = $env:DSH_HOME
if (-not $DshHome) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }

$ProfileDir = Join-Path $DshHome "profiles\$Profile"
$PkgJson    = Join-Path $ProfileDir 'package.json'
if (-not (Test-Path $PkgJson)) { Warn "profile 不存在：$ProfileDir"; exit 1 }

$pkg = Get-Content $PkgJson -Raw | ConvertFrom-Json

if ($null -ne $pkg.dependencies.$PackageName) {
    $pkg.dependencies.PSObject.Properties.Remove($PackageName) | Out-Null
    Good "dependencies 已移除 $PackageName"
} else { Say "dependencies 里没有 $PackageName" }

$cur = @($pkg.dsh.profile.bundles)
if ($cur -contains $PackageName) {
    $pkg.dsh.profile.bundles = @($cur | Where-Object { $_ -ne $PackageName })
    Good "bundles 已移除 $PackageName"
} else { Say "bundles 里没有 $PackageName" }

$pkg | ConvertTo-Json -Depth 64 | Set-Content $PkgJson -Encoding utf8
Good "已写入 $PkgJson"

$link = Join-Path $ProfileDir "node_modules\$PackageName"
if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.LinkType) { $item.Delete(); Good "已删除联接点 $link" }
    else { Warn "$link 是实体目录，未自动删除" }
}

if ($ResetClientState) {
    Write-Host ''
    Warn '主题开关存在浏览器 localStorage，只能从浏览器侧清：'
    Write-Host '   DevTools → Application → Local Storage → 删掉 cr-plan-enabled'
    Write-Host '   或在「长征计划」页把主开关关掉（会还原 DSH 原本文案与配色）'
}

Write-Host ''
Good '卸载完成。重启 DSH 生效。'
Write-Host '二次开发定制 · QQ 2363984977' -ForegroundColor Magenta
