export const SAVE_VERSION = 1;

export const DEFAULT_TUNING = {
  startSpeed: 185,
  maxSpeed: 520,
  obstacleInterval: 0.78,
  shardInterval: 1.55,
  effectsIntensity: 1,
  musicVolume: 0.28,
  sfxVolume: 0.78,
};

function readNumber(tweaks, key) {
  const value = tweaks?.get?.(key);
  return Number.isFinite(value) ? value : DEFAULT_TUNING[key];
}

export function createTuning(tweaks) {
  const values = { ...DEFAULT_TUNING };
  const unsubscribers = [];

  for (const key of Object.keys(DEFAULT_TUNING)) {
    values[key] = readNumber(tweaks, key);
    const unsubscribe = tweaks?.subscribe?.(key, (value) => {
      if (Number.isFinite(value)) values[key] = value;
    });
    if (typeof unsubscribe === "function") unsubscribers.push(unsubscribe);
  }

  return {
    values,
    destroy() {
      for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
    },
  };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
