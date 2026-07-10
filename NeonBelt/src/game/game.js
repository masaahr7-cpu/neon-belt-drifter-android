import { preloadGameAssets } from "./assets.js";
import { createGameAudio } from "./audio.js";
import { createTuning, SAVE_VERSION } from "./config.js";
import { createInput } from "./input.js";
import { createRenderer } from "./renderer.js";
import { createUi } from "./ui.js";
import { createWorld } from "./world.js";

function sanitizeScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)));
}

async function loadBestScore(sdk) {
  try {
    const saved = await sdk.gameState.load();
    if (saved?.version === SAVE_VERSION && Number.isFinite(saved.highScore)) {
      return Math.max(0, Math.floor(saved.highScore));
    }
  } catch {
    return 0;
  }
  return 0;
}

function saveBestScore(sdk, highScore) {
  void sdk.gameState.save({ version: SAVE_VERSION, highScore }).catch(() => {});
}

function submitScore(sdk, score) {
  const value = sanitizeScore(score);
  if (value === null) return;
  void sdk.leaderboard.submit(value).catch(() => {});
}

function vibrate(sdk, pattern) {
  try {
    if (sdk.device.haptics.isSupported()) void sdk.device.haptics.vibrate(pattern).catch(() => {});
  } catch {
    // Haptics are optional; gameplay remains identical without them.
  }
}

export function createGame({ mount, sdk, ready, tweaks, assets }) {
  let cleanup = () => {};

  return {
    start() {
      const tuning = createTuning(tweaks);
      const ui = createUi(mount);
      const renderer = createRenderer(ui.canvas);
      let audio = null;
      let frameId = 0;
      let lastTime = 0;
      let accumulator = 0;
      let readyToStart = false;
      let destroyed = false;

      const world = createWorldHooks();
      const input = createInput(ui.canvas, world);

      function createWorldHooks() {
        return createWorld({
          tuning: tuning.values,
          onPickup({ multiplier }) {
            audio?.playSfx("pickup", { volume: 0.82, rate: 0.96 + Math.random() * 0.1 });
            audio?.playBlip(660 * (1 + multiplier * 0.08), 0.045);
            vibrate(sdk, 18);
          },
          onNearMiss() {
            audio?.playSfx("whoosh", { volume: 0.36, rate: 0.94 + Math.random() * 0.12 });
          },
          onCrash(result) {
            input.disable();
            audio?.playSfx("crash", { volume: 0.95, rate: 0.96 });
            vibrate(sdk, [28, 30, 48]);
            saveBestScore(sdk, result.highScore);
            submitScore(sdk, result.score);
            window.setTimeout(() => {
              if (!destroyed) ui.showGameOver(result);
            }, 420);
          },
        });
      }

      function resize() {
        const rect = ui.shell.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const view = renderer.resize(rect.width, rect.height, window.devicePixelRatio);
        world.setView(view);
      }

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(ui.shell);
      resize();

      function beginRun() {
        if (!readyToStart) return;
        ui.hideStart();
        ui.hideGameOver();
        input.enable();
        world.start();
        audio?.updateMix();
        void audio?.unlock();
      }

      ui.onStart(beginRun);
      ui.onReplay(beginRun);
      ui.setLoading("Loading flight path…");

      async function preload() {
        const [assetBundle, bestScore] = await Promise.all([
          preloadGameAssets(assets),
          loadBestScore(sdk),
        ]);
        if (destroyed) return;
        renderer.setAssets(assetBundle);
        world.setHighScore(bestScore);
        world.setReady();
        audio = createGameAudio({ sdk, audioUrls: assetBundle.audioUrls, tuning: tuning.values });
        void audio.init();
        readyToStart = true;
        ui.setReady();
      }

      void preload().catch(() => {
        if (destroyed) return;
        ui.setLoading("Asset load failed — refresh to retry");
      });

      function loop(now) {
        if (destroyed) return;
        const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
        lastTime = now;
        accumulator += dt;
        const step = 1 / 60;
        let steps = 0;
        while (accumulator >= step && steps < 3) {
          world.update(step);
          accumulator -= step;
          steps += 1;
        }
        if (steps === 3) accumulator = 0;
        const snapshot = world.getSnapshot();
        renderer.render(snapshot, dt);
        ui.update(snapshot);
        audio?.updateMix();
        frameId = requestAnimationFrame(loop);
      }

      frameId = requestAnimationFrame(loop);

      cleanup = () => {
        destroyed = true;
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        input.destroy();
        audio?.destroy();
        tuning.destroy();
        ui.destroy();
      };
    },
    destroy() {
      cleanup();
      cleanup = () => {};
    },
    sdk,
    ready,
    tweaks,
    assets,
  };
}
