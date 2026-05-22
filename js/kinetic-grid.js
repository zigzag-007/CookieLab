/**
 * kinetic-grid.js
 * Canvas dot grid with mouse repulsion. Disabled on touch and reduced motion.
 */

export function initKineticGrid() {
  const canvas = document.getElementById('kinetic-grid');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const SPACING = 40;
  const DOT_R = 1;
  const INTERACT_R = 135;
  const REPEL = 16;
  const EASE = 0.12;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const points = [];
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
  let frame = 0, w = 0, h = 0, dpr = 1;

  const colors = () => {
    const dark = document.documentElement.classList.contains('dark');
    return {
      dot: dark ? 'rgba(125,211,252,0.16)' : 'rgba(37,99,235,0.1)',
      line: dark ? 'rgba(125,211,252,0.025)' : 'rgba(37,99,235,0.018)',
      active: dark ? 'rgba(56,189,248,0.34)' : 'rgba(37,99,235,0.2)',
    };
  };

  const buildGrid = () => {
    points.length = 0;
    for (let y = -SPACING; y <= h + SPACING; y += SPACING) {
      for (let x = -SPACING; x <= w + SPACING; x += SPACING) {
        points.push({ bx: x, by: y, x, y });
      }
    }
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildGrid();
  };

  const draw = () => {
    const c = colors();
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.line;

    for (let y = 0; y <= h; y += SPACING) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = 0; x <= w; x += SPACING) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    for (const p of points) {
      const dx = p.bx - pointer.x;
      const dy = p.by - pointer.y;
      const dist = Math.hypot(dx, dy);
      const inf = pointer.active && dist < INTERACT_R ? 1 - dist / INTERACT_R : 0;

      if (!reduceMotion && !isCoarse && inf > 0) {
        const angle = Math.atan2(dy, dx);
        const tx = p.bx + Math.cos(angle) * REPEL * inf;
        const ty = p.by + Math.sin(angle) * REPEL * inf;
        p.x += (tx - p.x) * 0.22;
        p.y += (ty - p.y) * 0.22;
      } else {
        p.x += (p.bx - p.x) * EASE;
        p.y += (p.by - p.y) * EASE;
      }

      ctx.beginPath();
      ctx.fillStyle = inf > 0.15 ? c.active : c.dot;
      ctx.arc(p.x, p.y, DOT_R + inf * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reduceMotion && !isCoarse) {
      frame = requestAnimationFrame(draw);
    }
  };

  resize();
  draw();

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; });
}
