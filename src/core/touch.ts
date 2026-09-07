import type { Input } from './input';

// Pad geometry in CSS px. The knob rests at the bottom centre of a rounded
// triangle; left/right travel turns the ship, forward travel opens the throttle.
const HALF_WIDTH = 56; // max sideways travel at the base
const FORWARD = 92; // max forward travel to the apex
const KNOB_INSET = 36; // knob centre's distance from the pad's bottom edge (matches CSS)
const TURN_DEADZONE = 8;
const THROTTLE_DEADZONE = 10;
const PAD_W = 176; // matches CSS .stick size
const PAD_H = 164;

/** SVG path for a triangle (apex up) with rounded corners, in a PAD_W x PAD_H box. */
function roundedTrianglePath(): string {
  const pts: [number, number][] = [
    [PAD_W / 2, 1],
    [PAD_W - 1, PAD_H - 1],
    [1, PAD_H - 1],
  ];
  const t = 0.22; // how far along each edge the corner starts rounding
  let d = '';
  for (let i = 0; i < 3; i++) {
    const [px, py] = pts[(i + 2) % 3]!;
    const [vx, vy] = pts[i]!;
    const [nx, ny] = pts[(i + 1) % 3]!;
    const a = [vx + (px - vx) * t, vy + (py - vy) * t];
    const b = [vx + (nx - vx) * t, vy + (ny - vy) * t];
    d += `${i === 0 ? 'M' : 'L'}${a[0]},${a[1]} Q${vx},${vy} ${b[0]},${b[1]} `;
  }
  return d + 'Z';
}

/**
 * Touch controls for phones. A thumbstick in the bottom-left corner: slide the
 * knob left/right to rotate, push it forward to thrust. A tap anywhere else fires.
 * Enabled when the device reports a coarse pointer or the first touch arrives.
 */
export function attachTouch(input: Input): void {
  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="stick">
      <svg viewBox="0 0 ${PAD_W} ${PAD_H}" aria-hidden="true"><path d="${roundedTrianglePath()}"/></svg>
      <div class="knob"></div>
    </div>
    <button class="pause" type="button" aria-label="Pause">||</button>
  `;
  document.body.appendChild(root);

  const stick = root.querySelector<HTMLDivElement>('.stick')!;
  const knob = root.querySelector<HTMLDivElement>('.knob')!;
  const pauseBtn = root.querySelector<HTMLButtonElement>('.pause')!;

  // iOS ignores user-scalable=no; kill double-tap and pinch zoom by hand so a
  // fumbled tap on the stick can't zoom the page into an unrecoverable state.
  const block = (e: Event) => e.preventDefault();
  document.addEventListener('dblclick', block, { passive: false });
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = performance.now();
      if (now - lastTouchEnd < 350) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  const enable = () => document.body.classList.add('touch');
  if (matchMedia('(pointer: coarse)').matches) enable();
  window.addEventListener('touchstart', enable, { once: true, passive: true });

  // ---- thumbstick ----------------------------------------------------------
  let stickPointer: number | null = null;

  const setKnob = (dx: number, dy: number) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const moveStick = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    // Origin is the knob's rest position: bottom centre of the pad.
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.bottom - KNOB_INSET);
    dy = Math.max(-FORWARD, Math.min(0, dy));
    const fwd = -dy / FORWARD;
    // Triangle: sideways range shrinks as the knob climbs toward the apex.
    const maxDx = HALF_WIDTH * (1 - 0.6 * fwd);
    dx = Math.max(-maxDx, Math.min(maxDx, dx));
    setKnob(dx, dy);

    const turn = Math.abs(dx) < TURN_DEADZONE ? 0 : dx / HALF_WIDTH;
    const throttle = -dy < THROTTLE_DEADZONE ? 0 : fwd;
    stick.classList.toggle('thrust', throttle > 0);
    input.stick = { turn: Math.max(-1, Math.min(1, turn)), throttle };
  };

  stick.addEventListener('pointerdown', (e) => {
    if (stickPointer !== null) return;
    stickPointer = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    stick.classList.add('active');
    moveStick(e);
    e.stopPropagation();
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickPointer) moveStick(e);
  });
  const releaseStick = (e: PointerEvent) => {
    if (e.pointerId !== stickPointer) return;
    stickPointer = null;
    stick.classList.remove('active', 'thrust');
    setKnob(0, 0);
    input.stick = null;
  };
  stick.addEventListener('pointerup', releaseStick);
  stick.addEventListener('pointercancel', releaseStick);

  // ---- pause button --------------------------------------------------------
  pauseBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  pauseBtn.addEventListener('click', () => input.press('pause'));
  // 'pause' is edge-triggered; release right after so the next tap toggles again.
  pauseBtn.addEventListener('click', () => setTimeout(() => input.release('pause'), 50));

  // ---- tap anywhere else to fire ------------------------------------------
  const firing = new Set<number>();
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    firing.add(e.pointerId);
    input.press('fire');
  });
  const endFire = (e: PointerEvent) => {
    if (!firing.delete(e.pointerId)) return;
    if (firing.size === 0) input.release('fire');
  };
  window.addEventListener('pointerup', endFire);
  window.addEventListener('pointercancel', endFire);
}
