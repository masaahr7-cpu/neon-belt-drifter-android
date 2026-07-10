import assetsManifest from "../assets.json";

const IMAGE_IDS = ["SPACE_BACKDROP", "SHIP_SPRITE", "ASTEROID_ATLAS", "SHARD_SPRITE"];
const AUDIO_IDS = ["MUSIC_LOOP", "PICKUP_SFX", "CRASH_SFX", "WHOOSH_SFX"];
const ASTEROID_FRAMES_URL = "/generated-assets/asteroid_atlas-transparent.frames.json";

function resolveAsset(assets, id) {
  return assets?.get?.(id) || assetsManifest[id];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Missing image asset URL"));
      return;
    }

    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load JSON: ${url}`);
  return response.json();
}

export async function preloadGameAssets(assets) {
  const entries = await Promise.all(
    IMAGE_IDS.map(async (id) => [id, await loadImage(resolveAsset(assets, id))]),
  );
  const asteroidFrames = await loadJson(ASTEROID_FRAMES_URL);
  const audioUrls = Object.fromEntries(AUDIO_IDS.map((id) => [id, resolveAsset(assets, id)]));

  return {
    images: Object.fromEntries(entries),
    asteroidFrames: asteroidFrames.frames,
    audioUrls,
  };
}
