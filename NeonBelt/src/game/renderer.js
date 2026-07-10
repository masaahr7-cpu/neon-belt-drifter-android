function drawFrame(ctx, image, frame, x, y, size, rotation) {
  const source = frame.source;
  const crop = frame.content || source;
  const scale = size / source.w;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.w,
    crop.h,
    -source.w * scale * 0.5 + (crop.x - source.x) * scale,
    -source.h * scale * 0.5 + (crop.y - source.y) * scale,
    crop.w * scale,
    crop.h * scale,
  );
  ctx.restore();
}

function drawImageCentered(ctx, image, x, y, width, height, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(image, -width * 0.5, -height * 0.5, width, height);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  let assets = null;
  let view = {
    width: 390,
    height: 844,
    scale: 1,
    dpr: 1,
    safeTop: 20,
    safeBottom: 18,
  };
  let bgScroll = 0;

  function setAssets(nextAssets) {
    assets = nextAssets;
  }

  function resize(width, height, dpr) {
    const nextWidth = Math.max(1, Math.floor(width));
    const nextHeight = Math.max(1, Math.floor(height));
    const nextDpr = Math.min(2, Math.max(1, dpr || 1));
    canvas.width = Math.floor(nextWidth * nextDpr);
    canvas.height = Math.floor(nextHeight * nextDpr);
    ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
    view = {
      width: nextWidth,
      height: nextHeight,
      dpr: nextDpr,
      scale: Math.max(0.72, Math.min(1.45, Math.min(nextWidth / 390, nextHeight / 844) + 0.14)),
      safeTop: Math.max(16, Math.min(42, nextHeight * 0.035)),
      safeBottom: Math.max(14, Math.min(38, nextHeight * 0.026)),
    };
    return view;
  }

  function drawBackground(snapshot, dt) {
    const image = assets?.images.SPACE_BACKDROP;
    bgScroll = (bgScroll + snapshot.speed * 0.14 * dt) % view.height;

    if (!image) {
      const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
      gradient.addColorStop(0, "#140027");
      gradient.addColorStop(0.55, "#1d0746");
      gradient.addColorStop(1, "#090016");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, view.width, view.height);
      return;
    }

    const coverScale = Math.max(view.width / image.width, view.height / image.height);
    const drawWidth = image.width * coverScale;
    const drawHeight = image.height * coverScale;
    const x = (view.width - drawWidth) * 0.5;
    const offset = -drawHeight + (bgScroll % drawHeight);
    ctx.drawImage(image, x, offset, drawWidth, drawHeight);
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(image, x, -offset - drawHeight * 2, drawWidth, drawHeight);
    ctx.restore();
    ctx.drawImage(image, x, offset + drawHeight, drawWidth, drawHeight);
  }

  function drawShards(snapshot) {
    const image = assets?.images.SHARD_SPRITE;
    if (!image) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const shard of snapshot.shards) {
      if (!shard.active) continue;
      const pulse = 1 + Math.sin(shard.spin * 2.3) * 0.08;
      const h = shard.radius * 4.1 * pulse;
      const w = h * (image.width / image.height);
      const glow = ctx.createRadialGradient(shard.x, shard.y, 0, shard.x, shard.y, shard.radius * 3.2);
      glow.addColorStop(0, "rgba(244,255,93,0.55)");
      glow.addColorStop(1, "rgba(88,247,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(shard.x, shard.y, shard.radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
      drawImageCentered(ctx, image, shard.x, shard.y, w, h, Math.sin(shard.spin) * 0.16);
    }
    ctx.restore();
  }

  function drawObstacles(snapshot) {
    const image = assets?.images.ASTEROID_ATLAS;
    if (!image || !assets?.asteroidFrames?.length) return;
    for (const obstacle of snapshot.obstacles) {
      if (!obstacle.active) continue;
      const frame = assets.asteroidFrames[obstacle.frameIndex % assets.asteroidFrames.length];
      ctx.save();
      ctx.globalAlpha = 0.98;
      drawFrame(ctx, image, frame, obstacle.x, obstacle.y, obstacle.radius * 2.34, obstacle.rotation);
      ctx.restore();
    }
  }

  function drawParticles(snapshot) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of snapshot.particles) {
      if (!particle.active) continue;
      const age = 1 - particle.life / particle.maxLife;
      ctx.globalAlpha = Math.max(0, 1 - age);
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = particle.color;
      ctx.lineWidth = Math.max(1, particle.radius * 0.52);
      if (particle.type === "dash") {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 0.035, particle.y - particle.vy * 0.035);
        ctx.stroke();
      } else if (particle.type === "spark") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(age * Math.PI * 1.8);
        ctx.fillRect(-particle.radius * 0.5, -particle.radius * 0.5, particle.radius, particle.radius);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * (1 - age * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawShip(snapshot) {
    const image = assets?.images.SHIP_SPRITE;
    if (!image) return;
    const player = snapshot.player;
    const bob = snapshot.state === "playing" ? 0 : Math.sin(player.idle * 3.2) * 5 * view.scale;
    const shipHeight = player.radius * 4.2;
    const shipWidth = shipHeight * (image.width / image.height);
    const x = player.x;
    const y = player.y + bob;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const trailGradient = ctx.createLinearGradient(x, y + player.radius, x, y + player.radius * 7.8);
    trailGradient.addColorStop(0, "rgba(88,247,255,0.62)");
    trailGradient.addColorStop(0.5, "rgba(255,79,216,0.34)");
    trailGradient.addColorStop(1, "rgba(88,247,255,0)");
    ctx.fillStyle = trailGradient;
    ctx.beginPath();
    ctx.moveTo(x - player.radius * 0.72, y + player.radius * 1.1);
    ctx.lineTo(x + player.radius * 0.72, y + player.radius * 1.1);
    ctx.lineTo(x + player.radius * 0.22, y + player.radius * 7.6);
    ctx.lineTo(x - player.radius * 0.22, y + player.radius * 7.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawImageCentered(ctx, image, x, y, shipWidth, shipHeight, player.tilt * 0.28);
  }

  function render(snapshot, dt = 0) {
    ctx.save();
    const shake = snapshot.screenShake || 0;
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawBackground(snapshot, dt);
    drawShards(snapshot);
    drawObstacles(snapshot);
    drawParticles(snapshot);
    drawShip(snapshot);
    ctx.restore();

    const vignette = ctx.createRadialGradient(
      view.width * 0.5,
      view.height * 0.44,
      view.width * 0.2,
      view.width * 0.5,
      view.height * 0.5,
      view.height * 0.72,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(1,0,18,0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, view.width, view.height);
  }

  return {
    setAssets,
    resize,
    render,
    getView() {
      return view;
    },
  };
}
