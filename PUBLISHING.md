# Publishing checklist

The package is built and verified locally. Nothing has been pushed.

## 1. Fill in your GitHub identity

The repository is `huzhengcai471-crypto/cyber-red-ui`. Before publishing, update
the private flag only if you intend to make the repository public, then repack:

```powershell
node -e "const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.private=false;fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n')"
```

The repository links are already set to `huzhengcai471-crypto/cyber-red-ui`.

## 2. Quick sanity checks

```powershell
node --check index.js
node --check client.js
node -e "for (const f of ['client.js','index.js']) { const s=require('fs').readFileSync(f,'utf8'); if (/\uFFFD/.test(s)) throw new Error('mojibake in '+f) }"
```

## 3. Pack

```powershell
pnpm pack
```

Expected: `dsh-cyber-red-ui-1.0.0.tgz`, ~82 MB.

## 4. Publish to GitHub

```powershell
git init
git add .
git commit -m "dsh-cyber-red-ui 1.0.0"
git branch -M main
git remote add origin https://github.com/huzhengcai471-crypto/cyber-red-ui.git
git push -u origin main
```

> The tarball is git-ignored. Publish source; let users install from source.

## 5. Optional: release asset

If you also want a downloadable tarball, attach `dsh-cyber-red-ui-1.0.0.tgz`
to a GitHub Release. Users can then install with:

```powershell
dsh plugin --profile desktop add https://github.com/huzhengcai471-crypto/cyber-red-ui/releases/download/v1.0.0/dsh-cyber-red-ui-1.0.0.tgz
```

## 6. How users install

```powershell
dsh plugin --profile desktop add github:huzhengcai471-crypto/cyber-red-ui
```

Then add `"dsh-cyber-red-ui"` to `dsh.profile.bundles` in
`~/.dsh/profiles/desktop/package.json` and restart DSH.

## Notes on size

77 MB of the 85 MB package is media (5 videos + 8 FLAC + 3 OGG + 1 WAV + 1 GIF).
A git clone therefore transfers ~82 MB. If that is too heavy, the options are:

- drop the largest audio tracks, or
- publish the tarball as a Release asset and keep the repo media-free.

The host half is already lazy: importing it costs ~3 MB of RSS regardless of
asset size, so runtime memory is not a concern.
