import sdk from "@playabl/sdk";

function createStandaloneTweaks(manifest) {
  const values = Object.fromEntries(
    Object.entries(manifest).map(([key, config]) => [key, config?.value]),
  );

  return {
    get(key) {
      return values[key];
    },
    subscribe() {
      return () => {};
    },
    onChange() {
      return () => {};
    },
    snapshot() {
      return { ...values };
    },
  };
}

function createStandaloneAssets(manifest) {
  return {
    get(id) {
      return manifest[id];
    },
    getReplacedUrl(url) {
      return url;
    },
    snapshot() {
      return { ...manifest };
    },
  };
}

function createStandaloneAudio() {
  let context = null;
  return {
    async getContext() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is not supported");
      context ||= new AudioContextClass();
      return {
        context,
        async unlock() {
          if (context.state !== "running") await context.resume();
        },
        onStateChange() {
          return () => {};
        },
        async dispose() {
          if (context?.state !== "closed") await context.close();
          context = null;
        },
      };
    },
  };
}

function createStandaloneSdk() {
  return {
    gameState: {
      async load() {
        const raw = window.localStorage.getItem("neon-belt-drifter-save");
        return raw ? JSON.parse(raw) : null;
      },
      async save(state) {
        window.localStorage.setItem("neon-belt-drifter-save", JSON.stringify(state));
        return { ok: true, fallback: "localStorage" };
      },
      async clear() {
        window.localStorage.removeItem("neon-belt-drifter-save");
      },
    },
    leaderboard: {
      async submit() {
        return { accepted: false };
      },
    },
    audio: createStandaloneAudio(),
    device: {
      haptics: {
        isSupported() {
          return "vibrate" in navigator;
        },
        async vibrate(pattern) {
          navigator.vibrate?.(pattern);
        },
        async cancel() {
          navigator.vibrate?.(0);
        },
      },
    },
  };
}

export async function initPlatform({ tweaksManifest, assetsManifest }) {
  try {
    const ready = await sdk.ready();
    const tweaks = await sdk.tweaks.init(tweaksManifest);
    const assets = Object.keys(assetsManifest).length > 0
      ? await sdk.assets.register(assetsManifest)
      : undefined;
    return { sdk, ready, tweaks, assets };
  } catch {
    const standaloneSdk = createStandaloneSdk();
    return {
      sdk: standaloneSdk,
      ready: { isLocalDev: true, parentOrigin: null, standalone: true },
      tweaks: createStandaloneTweaks(tweaksManifest),
      assets: createStandaloneAssets(assetsManifest),
    };
  }
}
