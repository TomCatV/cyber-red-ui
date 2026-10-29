import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const runtimeModules = process.env.PLAYWRIGHT_MODULE_DIR || path.join(os.homedir(),
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');

/* ── playwright 解析（2026-10-29 转载版追加容错）─────────────────────
 * 上游只认 codex runtime 那一个固定路径。这里改成按顺序回落到：
 *   1) PLAYWRIGHT_MODULE_DIR 环境变量
 *   2) codex runtime 固定路径（上游原行为）
 *   3) 本仓库自己的 node_modules
 * 任一命中即可，全不命中才报错并提示怎么装。 */
const playwrightCandidates = [
  process.env.PLAYWRIGHT_MODULE_DIR,
  path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),
  path.join(packageRoot, 'node_modules'),
  path.join(packageRoot, '..', 'node_modules'),
].filter(Boolean);

let chromium = null;
const playwrightTried = [];
for (const dir of playwrightCandidates) {
  try {
    const req = createRequire(path.join(dir, 'package.json'));
    ({ chromium } = req('playwright'));
    break;
  } catch (err) {
    playwrightTried.push(`${dir} (${err.code || err.message})`);
  }
}
if (!chromium) {
  console.error('[x] 找不到 playwright。已尝试：');
  for (const t of playwrightTried) console.error('    - ' + t);
  console.error('');
  console.error('  修法一：npm i -D playwright && npx playwright install chromium');
  console.error('  修法二：$env:PLAYWRIGHT_MODULE_DIR = "已有 playwright 的 node_modules 路径"');
  process.exit(1);
}

/* ── react 解析（2026-10-29 转载版追加回落）─────────────────────────
 * 上游写死 ../music-player-test-runtime/node_modules，clone 下来必然报
 * "Cannot find module 'react/package.json'"。这里同样按顺序回落，
 * 并给出 `node scripts/prepare-test-deps.mjs` 这条一键修法。 */
const reactCandidates = [
  process.env.REACT_TEST_MODULE_DIR,
  path.resolve(packageRoot, '../music-player-test-runtime/node_modules'),
  path.join(packageRoot, 'node_modules'),
].filter(Boolean);

let reactRequire = null;
const reactTried = [];
for (const dir of reactCandidates) {
  try {
    const req = createRequire(path.join(dir, 'package.json'));
    req.resolve('react/package.json');
    req.resolve('react-dom/package.json');
    reactRequire = req;
    break;
  } catch (err) {
    reactTried.push(`${dir} (${err.code || err.message})`);
  }
}
if (!reactRequire) {
  console.error('[x] 找不到 react / react-dom。已尝试：');
  for (const t of reactTried) console.error('    - ' + t);
  console.error('');
  console.error('  一键修法：node scripts/prepare-test-deps.mjs');
  console.error('  或自带：  $env:REACT_TEST_MODULE_DIR = "C:\\path\\to\\node_modules"');
  process.exit(1);
}
const source = await fs.readFile(process.env.CLIENT_SOURCE || path.join(packageRoot, 'client.js'), 'utf8');
const slice = (start, end) => {
  const offset = source.indexOf(start);
  assert.ok(offset >= 0, `missing source boundary: ${start}`);
  const limit = source.indexOf(end, offset);
  assert.ok(limit > offset, `missing source boundary: ${end}`);
  return source.slice(offset, limit);
};

// Use the shipped player and rail with real React mounting/unmounting.
// Stub media and rail services so no hardware, RPC or asset server is needed.
const harness = `(() => {
  const h = React.createElement;
  const RailContext = React.createContext(false);
  const useRailOpen = () => React.useContext(RailContext);
  const useMusicState = () => true;
  const MUSIC_TRACKS = [{ id: 'test', label: 'Test track', url: 'data:audio/wav;base64,' }];
  const musicTrackEnabled = () => true;
  let pauseMainMusic = null;
  const stopMusicPreview = () => {};
  const useFormText = () => 'Lab status';
  const useWorldCardVisible = () => false;
  const useTickerVisible = () => false;
  const useAvatarUrl = () => '';
  const applyRailWidth = () => {};
  const frameElement = () => null;
  const CloseRailButton = () => null, SystemMonitor = () => null;
  const WorldStatusCard = () => null, FakeStatusCards = () => null;
  const CodeScroll = () => null, MetricTicker = () => null;
  HTMLMediaElement.prototype.load = function () {
    this.dataset.loads = String(Number(this.dataset.loads || 0) + 1);
  };
  HTMLMediaElement.prototype.play = function () { this.dataset.playing = 'true'; return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () { this.dataset.playing = 'false'; };
  ${slice('function StyleTag(props)', '/* Brand mark:')}
  ${source.includes('const MUSIC_PLAYER_CSS =') ? slice('const MUSIC_PLAYER_CSS =', 'function MusicPlayer()') : ''}
  ${slice('function MusicPlayer()', '/* A bare dark-red')}
  ${slice('const RAIL_CSS =', '/* The portrait is inlined')}
  ${slice('function LabRail()', 'function Decor()')}
  function App() {
    const [open, setOpen] = React.useState(window.initialRailOpen);
    window.setRailOpen = setOpen;
    return h(RailContext.Provider, { value: open },
      h('div', { className: 'sidebar' }, h(MusicPlayer)), h(LabRail));
  }
  window.root = ReactDOM.createRoot(document.querySelector('#root'));
  ReactDOM.flushSync(() => window.root.render(h(App)));
})()`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const snapshot = () => page.locator('.cr-music-player').evaluate(player => {
    const measure = el => {
      const css = getComputedStyle(el), rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, display: css.display,
        color: css.color, background: css.background, border: css.border,
        boxShadow: css.boxShadow, padding: css.padding, fontSize: css.fontSize };
    };
    const audio = player.querySelector('audio');
    return { player: measure(player), title: measure(player.querySelector('.cr-music-player__title')),
      buttons: [...player.querySelectorAll('button')].map(measure),
      audioDisplay: getComputedStyle(audio).display, audioLoads: audio.dataset.loads,
      playing: audio.dataset.playing, sameAudio: audio === window.originalAudio };
  });

  for (const initiallyOpen of [true, false]) {
    await page.setContent(`<!doctype html><html><head><style>
      body { margin: 0; background: #0d0d0d; color: white; font: 14px Arial; }
      .sidebar { width: 260px; display: flex; flex-direction: column; }
    </style></head><body><div id="root"></div></body></html>`);
    await page.addScriptTag({ path: path.join(path.dirname(reactRequire.resolve('react/package.json')),
      'umd/react.production.min.js') });
    await page.addScriptTag({ path: path.join(path.dirname(reactRequire.resolve('react-dom/package.json')),
      'umd/react-dom.production.min.js') });
    await page.evaluate(open => { window.initialRailOpen = open; }, initiallyOpen);
    await page.evaluate(harness);
    await page.waitForFunction(() => document.querySelector('audio')?.dataset.loads === '1');
    await page.evaluate(() => { window.originalAudio = document.querySelector('audio'); });
    await page.getByRole('button', { name: '\u64ad\u653e', exact: true }).click();
    await page.mouse.move(700, 500);
    const baseline = await snapshot();
    assert.equal(baseline.player.width, 260, 'player fills the sidebar');
    assert.equal(baseline.player.height, 57, 'player retains its fixed card height');
    assert.equal(baseline.player.display, 'grid');
    assert.notEqual(baseline.player.boxShadow, 'none');
    assert.equal(baseline.audioDisplay, 'none');
    assert.equal(baseline.playing, 'true');
    for (const button of baseline.buttons) assert.equal(button.height, 25);

    for (const open of [!initiallyOpen, initiallyOpen, !initiallyOpen]) {
      await page.evaluate(open => ReactDOM.flushSync(() => window.setRailOpen(open)), open);
      assert.equal(await page.locator('.cr-rail').count(), Number(open));
      assert.deepEqual(await snapshot(), baseline,
        `rail ${open ? 'opening' : 'closing'} must preserve player geometry, styling and audio`);
    }
    await page.evaluate(() => ReactDOM.flushSync(() => window.root.unmount()));
    assert.equal(await page.locator('style').count(), 1, 'component styles are cleaned up on unmount');
  }
  assert.deepEqual(errors, []);
  console.log('ok: rail initially open/closed, repeated toggles preserve player size, styling and audio');
} finally {
  await browser.close();
}
