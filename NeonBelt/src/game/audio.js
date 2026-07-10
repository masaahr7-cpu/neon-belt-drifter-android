const SFX_KEYS = {
  pickup: "PICKUP_SFX",
  crash: "CRASH_SFX",
  whoosh: "WHOOSH_SFX",
};

function safeGain(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function createGameAudio({ sdk, audioUrls, tuning }) {
  let audioHandle = null;
  let ready = false;
  let unlocked = false;
  let musicBuffer = null;
  let musicSource = null;
  let musicGain = null;
  const sfx = new Map();

  async function loadBuffer(url) {
    if (!url || !audioHandle) return null;
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return audioHandle.context.decodeAudioData(arrayBuffer);
  }

  function trimAndNormalize(name, buffer) {
    if (!buffer) return;
    const data = buffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
    const threshold = peak * 0.02;
    let start = 0;
    while (start < data.length && Math.abs(data[start]) < threshold) start += 1;
    sfx.set(name, {
      buffer,
      offset: start / buffer.sampleRate,
      gain: peak > 0 ? 0.85 / peak : 1,
    });
  }

  async function init() {
    try {
      audioHandle = await sdk.audio.getContext();
      const [music, pickup, crash, whoosh] = await Promise.all([
        loadBuffer(audioUrls.MUSIC_LOOP),
        loadBuffer(audioUrls.PICKUP_SFX),
        loadBuffer(audioUrls.CRASH_SFX),
        loadBuffer(audioUrls.WHOOSH_SFX),
      ]);
      musicBuffer = music;
      trimAndNormalize("pickup", pickup);
      trimAndNormalize("crash", crash);
      trimAndNormalize("whoosh", whoosh);
      ready = true;
      if (unlocked) startMusic();
    } catch {
      ready = false;
    }
  }

  async function unlock() {
    try {
      if (!audioHandle) audioHandle = await sdk.audio.getContext();
      await audioHandle.unlock();
      unlocked = true;
      startMusic();
    } catch {
      unlocked = false;
    }
  }

  function startMusic() {
    if (!ready || !unlocked || !musicBuffer || !audioHandle || musicSource) return;
    const context = audioHandle.context;
    if (context.state !== "running") return;
    musicSource = context.createBufferSource();
    musicGain = context.createGain();
    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicGain.gain.value = safeGain(tuning.musicVolume);
    musicSource.connect(musicGain).connect(context.destination);
    musicSource.start();
  }

  function updateMix() {
    if (musicGain) musicGain.gain.value = safeGain(tuning.musicVolume);
  }

  function playSfx(name, { volume = 1, rate = 1 } = {}) {
    if (!ready || !audioHandle || audioHandle.context.state !== "running") return;
    const entry = sfx.get(name);
    if (!entry) return;
    const source = audioHandle.context.createBufferSource();
    const gain = audioHandle.context.createGain();
    source.buffer = entry.buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume * entry.gain * safeGain(tuning.sfxVolume);
    source.connect(gain).connect(audioHandle.context.destination);
    source.start(0, entry.offset);
  }

  function playBlip(frequency = 660, duration = 0.055) {
    if (!audioHandle || audioHandle.context.state !== "running") return;
    const context = audioHandle.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.18 * safeGain(tuning.sfxVolume), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function stopMusic() {
    if (!musicSource) return;
    try {
      musicSource.stop();
    } catch {
      // Source may already have stopped during teardown; silent cleanup is safest.
    }
    musicSource.disconnect();
    musicGain?.disconnect();
    musicSource = null;
    musicGain = null;
  }

  return {
    init,
    unlock,
    updateMix,
    playSfx,
    playBlip,
    stopMusic,
    destroy() {
      stopMusic();
      sfx.clear();
      musicBuffer = null;
      ready = false;
    },
    SFX_KEYS,
  };
}
