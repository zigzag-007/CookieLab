/**
 * cursor-glow.js
 * Soft glow that follows the cursor. Disabled on touch and reduced motion.
 */

export function initCursorGlow() {
  const node = document.getElementById('cursor-glow');
  if (!node) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduceMotion || isCoarse) return;

  let frame = 0;
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  const setVars = (x, y) => {
    node.style.setProperty('--cursor-x', x + 'px');
    node.style.setProperty('--cursor-y', y + 'px');
  };
  setVars(currentX, currentY);

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  };

  const tick = () => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    setVars(currentX, currentY);
    frame = requestAnimationFrame(tick);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  frame = requestAnimationFrame(tick);
}
