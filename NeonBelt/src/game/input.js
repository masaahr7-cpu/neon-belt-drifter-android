export function createInput(canvas, world) {
  let enabled = false;
  let pointerId = null;

  function updateTarget(event) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    world.setPlayerTarget(event.clientX - rect.left, event.clientY - rect.top);
  }

  function onPointerDown(event) {
    if (!enabled || pointerId !== null) return;
    pointerId = event.pointerId;
    canvas.setPointerCapture?.(pointerId);
    updateTarget(event);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!enabled || event.pointerId !== pointerId) return;
    updateTarget(event);
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    event.preventDefault();
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return {
    enable() {
      enabled = true;
    },
    disable() {
      enabled = false;
      pointerId = null;
    },
    destroy() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
