function formatScore(score) {
  return Math.max(0, Math.floor(score)).toLocaleString("en-US");
}

export function createUi(mount) {
  const shell = document.createElement("section");
  shell.className = "neon-game";
  shell.innerHTML = `
    <canvas class="game-surface" aria-label="Neon Belt Drifter playfield"></canvas>
    <div class="hud" aria-live="polite">
      <div class="hud-badge hud-score"><span>Score</span><strong>0</strong></div>
      <div class="streak-wrap" aria-label="streak meter">
        <div class="streak-bar"><i></i></div>
        <b>x1</b>
      </div>
      <div class="hud-badge hud-best"><span>Best</span><strong>0</strong></div>
    </div>
    <div class="start-overlay">
      <span class="game-title">Neon Belt<br>Drifter</span>
      <button class="start-button" type="button">Loading flight path…</button>
      <a class="download-link" href="/android-build.html">Download full source + workflow</a>
    </div>
    <div class="game-over" hidden>
      <div class="result-panel">
        <p class="result-kicker">Game Over</p>
        <strong class="result-score">0</strong>
        <span class="result-best">Best 0</span>
        <button class="replay-button" type="button">Replay</button>
      </div>
    </div>
  `;

  const canvas = shell.querySelector("canvas");
  const startOverlay = shell.querySelector(".start-overlay");
  const startButton = shell.querySelector(".start-button");
  const scoreEl = shell.querySelector(".hud-score strong");
  const bestEl = shell.querySelector(".hud-best strong");
  const streakFill = shell.querySelector(".streak-bar i");
  const streakLabel = shell.querySelector(".streak-wrap b");
  const gameOver = shell.querySelector(".game-over");
  const resultScore = shell.querySelector(".result-score");
  const resultBest = shell.querySelector(".result-best");
  const resultKicker = shell.querySelector(".result-kicker");
  const replayButton = shell.querySelector(".replay-button");

  mount.replaceChildren(shell);

  return {
    shell,
    canvas,
    onStart(handler) {
      startButton.addEventListener("click", handler);
    },
    onReplay(handler) {
      replayButton.addEventListener("click", handler);
    },
    setLoading(message) {
      startOverlay.hidden = false;
      startButton.textContent = message;
    },
    setReady() {
      startButton.textContent = "Tap to begin";
      startOverlay.classList.add("is-ready");
    },
    hideStart() {
      startOverlay.hidden = true;
    },
    update(snapshot) {
      scoreEl.textContent = formatScore(snapshot.score);
      bestEl.textContent = formatScore(snapshot.highScore);
      const multiplier = Math.min(5, 1 + Math.floor(snapshot.streak / 4));
      streakLabel.textContent = `x${multiplier}`;
      const fill = snapshot.streakTimer > 0 ? Math.min(1, snapshot.streakTimer / 4.5) : 0;
      streakFill.style.inlineSize = `${Math.max(0.08, fill) * 100}%`;
      streakFill.style.opacity = fill > 0 ? "1" : "0.38";
    },
    showGameOver({ score, highScore, isNewBest }) {
      resultKicker.textContent = isNewBest ? "New Best" : "Game Over";
      resultScore.textContent = formatScore(score);
      resultBest.textContent = `Best ${formatScore(highScore)}`;
      gameOver.hidden = false;
      replayButton.focus({ preventScroll: true });
    },
    hideGameOver() {
      gameOver.hidden = true;
    },
    destroy() {
      mount.replaceChildren();
    },
  };
}
