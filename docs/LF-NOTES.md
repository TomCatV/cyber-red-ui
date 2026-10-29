# 换行符与素材完整性说明

## 为什么加 `.gitattributes`

上游 `dsh-cyber-red-ui` 没有 `.gitattributes`。本机 `core.autocrlf=true`
（Git for Windows 安装时的常见默认值）clone 下来会在 checkout 阶段把
所有文本文件转成 CRLF：

```
client.js（8863923 字节）→ 每个 \n 前面多一个 \r
```

JS 引擎能跑，但有两个实际问题：

1. **对不上账**：`client.js` 与 Release tarball 不再逐字节一致，出问题无法用 SHA256 比对；
2. **二进制被误判的风险**：`assets/*.flac / *.wav / *.mp4` 没有 `binary` 声明，
   一旦 Git 把某个文件判定为 text，素材会被静默改写 —— 这类损坏极难发现。

## 本仓库的规则

见仓库根 `.gitattributes`：

```gitattributes
* text=auto eol=lf
*.js *.mjs *.json *.md *.yml *.ps1 *.svg  →  text eol=lf
*.mp4 *.gif *.flac *.wav *.ogg *.mp3 *.png →  binary
```

## 自查

```powershell
# client.js 里应当一个 \r 都没有
node -e "const b=require('fs').readFileSync('client.js');let n=0;for(let i=0;i<b.length;i++)if(b[i]===13)n++;console.log('CR=',n,'bytes=',b.length)"
```

正常输出：

```
CR= 0 bytes= 8863923
```

## 修好已有的工作副本

```powershell
git rm --cached -r . -q
git reset --hard -q
git checkout -- .
```

## 素材完整性

```bash
npm run check:package
# → ok: 18 bundled media assets, 6 required package files
```

素材若被换行符污染过，这个检查会报资产数量不符或体积异常。
