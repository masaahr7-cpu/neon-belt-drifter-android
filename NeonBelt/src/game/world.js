import { clamp, randomBetween } from "./config.js";

const OBSTACLE_POOL_SIZE = 34;
const SHARD_POOL_SIZE = 18;
const PARTICLE_POOL_SIZE = 180;

function makePool(size, factory) {
  return Array.from({ length: size }, () => ({ active: false, ...factory() }));
}

function takeFromPool(pool) {
  const inactive = pool.find((item) => !item.active);
  if (inactive) return inactive;
  return pool[0];
}

export function createWorld({ tuning, onPickup, onCrash, onNearMiss }) {
  const obstacles = makePool(OBSTACLE_POOL_SIZE, () => ({
    x: 0,
    y: 0,
    radius: 0,
    speed: 0,
    rotation: 0,
    rotationSpeed: 0,
    frameIndex: 0,
    nearMissed: false,
  }));
  const shards = makePool(SHARD_POOL_SIZE, () => ({
    x: 0,
    y: 0,
    radius: 0,
    speed: 0,
    spin: 0,
  }));
  const particles = makePool(PARTICLE_POOL_SIZE, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    radius: 0,
    color: "#ffffff",
    type: "dot",
  }));

  let view = {
    width: 390,
    height: 844,
    scale: 1,
    safeTop: 20,
    safeBottom: 18,
  };
  let state = "loading";
  let spawnTimer = 0;
  let shardTimer = 0;
  let elapsed = 0;
  let speed = tuning.startSpeed;
  let scoreFloat = 0;
  let screenShake = 0;
  let lastSpawnLane = 2;
  let highScore = 0;
  let streak = 0;
  let streakTimer = 0;
  let isNewBest = false;

  const player = {
    x: 195,
    y: 660,
    targetX: 195,
    targetY: 660,
    radius: 20,
    vx: 0,
    vy: 0,
    tilt: 0,
    idle: 0,
  };

  function playBounds() {
    const margin = 34 * view.scale;
    return {
      left: margin,
      right: view.width - margin,
      top: Math.max(view.safeTop + 82 * view.scale, view.height * 0.26),
      bottom: view.height - view.safeBottom - 48 * view.scale,
    };
  }

  function resetPlayer() {
    const bounds = playBounds();
    player.x = view.width * 0.5;
    player.y = clamp(view.height * 0.78, bounds.top, bounds.bottom);
    player.targetX = player.x;
    player.targetY = player.y;
    player.radius = 18 * view.scale;
    player.vx = 0;
    player.vy = 0;
    player.tilt = 0;
  }

  function clearPools() {
    for (const item of obstacles) item.active = false;
    for (const item of shards) item.active = false;
    for (const item of particles) item.active = false;
  }

  function emitParticles(x, y, count, color, power = 1, type = "dot") {
    const total = Math.round(count * tuning.effectsIntensity);
    for (let i = 0; i < total; i += 1) {
      const particle = takeFromPool(particles);
      const angle = Math.random() * Math.PI * 2;
      const burst = randomBetween(50, 210) * view.scale * power;
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * burst + randomBetween(-20, 20) * view.scale;
      particle.vy = Math.sin(angle) * burst - randomBetween(10, 70) * view.scale;
      particle.life = randomBetween(0.28, 0.75);
      particle.maxLife = particle.life;
      particle.radius = randomBetween(1.8, 4.8) * view.scale * power;
      particle.color = color;
      particle.type = type;
    }
  }

  function laneX(lane) {
    const bounds = playBounds();
    const lanes = view.width < 430 ? 5 : 7;
    return bounds.left + ((lane + 0.5) / lanes) * (bounds.right - bounds.left);
  }

  function spawnObstacle(extraDelay = 0) {
    const bounds = playBounds();
    const lanes = view.width < 430 ? 5 : 7;
    let lane = Math.floor(Math.random() * lanes);
    if (lane === lastSpawnLane) lane = (lane + 2 + Math.floor(Math.random() * (lanes - 2))) % lanes;
    lastSpawnLane = lane;

    const obstacle = takeFromPool(obstacles);
    const radius = randomBetween(22, 45 + Math.min(24, elapsed * 0.7)) * view.scale;
    obstacle.active = true;
    obstacle.x = clamp(laneX(lane) + randomBetween(-18, 18) * view.scale, bounds.left, bounds.right);
    obstacle.y = -radius - extraDelay * speed;
    obstacle.radius = radius;
    obstacle.speed = speed * randomBetween(0.88, 1.18);
    obstacle.rotation = Math.random() * Math.PI * 2;
    obstacle.rotationSpeed = randomBetween(-1.7, 1.7);
    obstacle.frameIndex = Math.floor(Math.random() * 3);
    obstacle.nearMissed = false;
  }

  function spawnShard() {
    const bounds = playBounds();
    const shard = takeFromPool(shards);
    const riskyOffset = randomBetween(-72, 72) * view.scale;
    const nearest = obstacles.find((obstacle) => obstacle.active && obstacle.y < view.height * 0.45);
    shard.active = true;
    shard.x = nearest
      ? clamp(nearest.x + riskyOffset, bounds.left + 12 * view.scale, bounds.right - 12 * view.scale)
      : randomBetween(bounds.left, bounds.right);
    shard.y = -40 * view.scale;
    shard.radius = 15 * view.scale;
    shard.speed = speed * randomBetween(0.82, 0.96);
    shard.spin = Math.random() * Math.PI * 2;
  }

  function start() {
    clearPools();
    resetPlayer();
    state = "playing";
    elapsed = 0;
    speed = tuning.startSpeed * view.scale;
    scoreFloat = 0;
    spawnTimer = 0.24;
    shardTimer = 1.05;
    streak = 0;
    streakTimer = 0;
    screenShake = 0;
    isNewBest = false;
  }

  function gameOver() {
    if (state !== "playing") return;
    state = "gameover";
    screenShake = 16 * view.scale * tuning.effectsIntensity;
    emitParticles(player.x, player.y, 42, "#ff4fd8", 1.25, "spark");
    emitParticles(player.x, player.y, 32, "#58f7ff", 1, "dot");
    const score = Math.floor(scoreFloat);
    isNewBest = score > highScore;
    highScore = Math.max(highScore, score);
    onCrash?.({ score, highScore, isNewBest });
  }

  function updatePlayer(dt) {
    const bounds = playBounds();
    const previousX = player.x;
    const previousY = player.y;
    const moveEase = 1 - Math.exp(-dt * 15);
    player.x += (player.targetX - player.x) * moveEase;
    player.y += (player.targetY - player.y) * moveEase;
    player.x = clamp(player.x, bounds.left, bounds.right);
    player.y = clamp(player.y, bounds.top, bounds.bottom);
    player.vx = (player.x - previousX) / Math.max(dt, 0.001);
    player.vy = (player.y - previousY) / Math.max(dt, 0.001);
    player.tilt += (clamp(player.vx / (620 * view.scale), -1, 1) - player.tilt) * (1 - Math.exp(-dt * 10));
    player.idle += dt;
  }

  function updateObstacles(dt) {
    for (const obstacle of obstacles) {
      if (!obstacle.active) continue;
      obstacle.y += obstacle.speed * dt;
      obstacle.rotation += obstacle.rotationSpeed * dt;
      if (obstacle.y - obstacle.radius > view.height + 36 * view.scale) {
        obstacle.active = false;
        continue;
      }

      const dx = obstacle.x - player.x;
      const dy = obstacle.y - player.y;
      const distance = Math.hypot(dx, dy);
      const hitDistance = obstacle.radius * 0.68 + player.radius * 0.82;
      if (distance < hitDistance) {
        gameOver();
        return;
      }

      if (!obstacle.nearMissed && obstacle.y > player.y && distance < hitDistance + 26 * view.scale) {
        obstacle.nearMissed = true;
        scoreFloat += 9 + streak * 1.5;
        emitParticles(player.x, player.y - 8 * view.scale, 5, "#58f7ff", 0.6, "dash");
        onNearMiss?.();
      }
    }
  }

  function updateShards(dt) {
    streakTimer = Math.max(0, streakTimer - dt);
    if (streakTimer === 0) streak = 0;

    for (const shard of shards) {
      if (!shard.active) continue;
      shard.y += shard.speed * dt;
      shard.spin += dt * 3.4;
      if (shard.y - shard.radius > view.height + 28 * view.scale) {
        shard.active = false;
        continue;
      }

      const distance = Math.hypot(shard.x - player.x, shard.y - player.y);
      if (distance < shard.radius + player.radius * 1.05) {
        shard.active = false;
        streak += 1;
        streakTimer = 4.5;
        const multiplier = Math.min(5, 1 + Math.floor(streak / 4));
        const award = 75 * multiplier;
        scoreFloat += award;
        emitParticles(shard.x, shard.y, 18, "#f4ff5d", 0.95, "spark");
        emitParticles(shard.x, shard.y, 8, "#58f7ff", 0.7, "dot");
        onPickup?.({ multiplier, award });
      }
    }
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.vy += 110 * view.scale * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    screenShake = Math.max(0, screenShake - 34 * view.scale * dt);
  }

  function update(dt) {
    updateParticles(dt);
    speed = Math.min(tuning.maxSpeed * view.scale, (tuning.startSpeed + elapsed * 5.8) * view.scale);

    if (state === "loading") return;
    if (state !== "playing") {
      player.idle += dt;
      return;
    }

    elapsed += dt;
    scoreFloat += dt * (18 + elapsed * 0.9);
    updatePlayer(dt);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      if (elapsed > 22 && Math.random() < 0.22) spawnObstacle(0.18);
      if (elapsed > 46 && Math.random() < 0.18) spawnObstacle(0.34);
      const pressure = Math.min(0.32, elapsed * 0.0045);
      spawnTimer = Math.max(0.34, tuning.obstacleInterval - pressure) * randomBetween(0.76, 1.18);
    }

    shardTimer -= dt;
    if (shardTimer <= 0) {
      spawnShard();
      shardTimer = Math.max(0.72, tuning.shardInterval - Math.min(0.35, elapsed * 0.003)) * randomBetween(0.82, 1.25);
    }

    updateObstacles(dt);
    updateShards(dt);
  }

  function setPlayerTarget(x, y) {
    const bounds = playBounds();
    player.targetX = clamp(x, bounds.left, bounds.right);
    player.targetY = clamp(y, bounds.top, bounds.bottom);
  }

  function setView(nextView) {
    const oldWidth = view.width;
    const oldHeight = view.height;
    const oldScale = view.scale;
    view = nextView;
    if (oldWidth > 0 && oldHeight > 0) {
      const sx = view.width / oldWidth;
      const sy = view.height / oldHeight;
      const ss = oldScale > 0 ? view.scale / oldScale : 1;
      player.x *= sx;
      player.targetX *= sx;
      player.y *= sy;
      player.targetY *= sy;
      for (const obstacle of obstacles) {
        obstacle.x *= sx;
        obstacle.y *= sy;
        obstacle.radius *= ss;
      }
      for (const shard of shards) {
        shard.x *= sx;
        shard.y *= sy;
        shard.radius = 15 * view.scale;
      }
    }
    if (state !== "playing") resetPlayer();
  }

  function setHighScore(value) {
    highScore = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  }

  function setReady() {
    if (state === "loading") {
      state = "idle";
      resetPlayer();
    }
  }

  return {
    start,
    update,
    setView,
    setReady,
    setPlayerTarget,
    setHighScore,
    getSnapshot() {
      return {
        state,
        view,
        player,
        obstacles,
        shards,
        particles,
        score: Math.floor(scoreFloat),
        highScore,
        streak,
        streakTimer,
        speed,
        screenShake,
        isNewBest,
      };
    },
  };
}
