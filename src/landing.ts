// Landing page: play the "hum" samples and gently parallax the cutouts.

const audio = new Audio();
let playing: HTMLButtonElement | null = null;

for (const btn of document.querySelectorAll<HTMLButtonElement>('.hum')) {
  btn.addEventListener('click', () => {
    if (playing === btn && !audio.paused) {
      audio.pause();
      return;
    }
    playing?.classList.remove('playing');
    playing = btn;
    btn.classList.add('playing');
    audio.src = import.meta.env.BASE_URL + btn.dataset.src!;
    void audio.play();
  });
}
audio.addEventListener('pause', () => playing?.classList.remove('playing'));
audio.addEventListener('ended', () => playing?.classList.remove('playing'));

// ---------- the rocket chases the cursor, using the game's own physics numbers ----------
const rocket = document.getElementById('rocket')!;
const flame = rocket.querySelector<HTMLElement>('.flame')!;
const DEG = Math.PI / 180;
const ROT_SPEED = 6.5;
const FRICTION = 0.98;
const MAX_SPEED = 7.54;
const THRUST = 0.3;
const STEP = 1000 / 45;

let x = innerWidth * 0.75;
let y = innerHeight * 0.3;
let vx = 0;
let vy = -1;
let angle = 0; // degrees, 0 = nose up, clockwise positive (matches the game)
let target: { x: number; y: number } | null = null;
let acc = 0;
let last = performance.now();
let flicker = 0;

// Page coordinates: the rocket lives in the document, so it scrolls with the content.
let pointer: { x: number; y: number } | null = null;
addEventListener('pointermove', (e) => {
  pointer = { x: e.clientX, y: e.clientY };
  target = { x: e.pageX, y: e.pageY };
});
// Scrolling with a still mouse moves the cursor relative to the page; keep the target honest.
addEventListener('scroll', () => {
  if (pointer) target = { x: pointer.x + scrollX, y: pointer.y + scrollY };
}, { passive: true });
addEventListener('pointerleave', () => {
  pointer = null;
  target = null;
});

/** Normalise a degree delta into (-180, 180]. */
function shortest(d: number): number {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

let talking = false;

function step(): void {
  let thrusting = false;
  if (talking) {
    // Ease off and drift on the current heading while talking; no steering, no thrust.
    const speed = Math.hypot(vx, vy);
    const drift = 0.6;
    if (speed > drift) {
      const k = Math.max(drift / speed, 0.94);
      vx *= k;
      vy *= k;
    }
  } else if (target) {
    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.hypot(dx, dy);
    // Angle the nose must point at: atan2 with "up" as zero.
    const want = Math.atan2(dx, -dy) / DEG;
    let diff = shortest(want - angle);
    angle = shortest(angle + Math.max(-ROT_SPEED, Math.min(ROT_SPEED, diff)));
    diff = shortest(want - angle);
    thrusting = dist > 80 && Math.abs(diff) < 40;
  }
  if (thrusting) {
    vx += Math.sin(angle * DEG) * THRUST;
    vy -= Math.cos(angle * DEG) * THRUST;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED) {
      vx *= MAX_SPEED / speed;
      vy *= MAX_SPEED / speed;
    }
  }
  if (!talking) {
    vx *= FRICTION;
    vy *= FRICTION;
  }
  x += vx;
  y += vy;
  // Wrap like the game does.
  if (x < -40) x = innerWidth + 40;
  if (x > innerWidth + 40) x = -40;
  // Vertical wrap spans the whole document, top of page to bottom.
  const pageH = document.documentElement.scrollHeight;
  if (y < -40) y = pageH + 40;
  if (y > pageH + 40) y = -40;

  flicker++;
  rocket.classList.toggle('thrust', thrusting);
  flame.style.transform = `rotate(${38 + ((flicker >> 1) % 2 ? 5 : -5)}deg) scale(${1 + ((flicker >> 1) % 2) * 0.12})`;
}

// ---------- the rocket occasionally talks while chasing ----------
const bubble = document.getElementById('bubble')!;
const PHRASES = [
  'Get over here, mister!',
  "I'm gonna get you!",
  'Hey, wait up!',
  'Not so fast!',
  'Come back here!',
  'Where are you going?',
  "You can't hide from me!",
  'Almost got you!',
  'Hold still!',
  'Stop running!',
  "I'm right behind you!",
  'Got you now!',
  'Oh, you think you are quick?',
  'Nobody outruns this rocket.',
  'Tag, you are it!',
  'Gotcha! ...almost.',
  'Slow down, buddy!',
  'Wait for meee!',
  'Just one more second!',
  'I see you!',
  'You are going the wrong way!',
  'Hey! Come back!',
  'Pull over!',
  "That's it, I'm coming!",
  'Left! No, right!',
  'Whoa, too fast!',
  'Do not make me turn around!',
  'I was built for this!',
  'Vroom vroom!',
  'Shhhhhhhhhhh!',
  '*takes a breath* Shhhhhh!',
  'Where did you go?',
  'Cursor! Get back here!',
  'This is a paper rocket, be gentle.',
  'I will chase you all day.',
  'Are we there yet?',
  'Ok, ok, I am turning!',
  'Hey, no fair!',
  'Missed me!',
  'Come on, just a little closer!',
  'You cannot escape the Jelly Sandwitch!',
  'Made by Jamie and Scott, in case you wondered.',
  'My dad does the engine noise.',
  'Do not tell the asteroids where I am.',
  'I need a bigger flame.',
  'Left rudder! We have no rudder!',
  'Brakes? Never heard of them.',
  'You move, I move.',
  'I have three lives, you know.',
  'Yoohoo! Over here!',
  'Round and round we go...',
  'Dizzy yet? I am.',
  'Look at me go!',
  'Careful, I wrap around the edges.',
  'Weeeeeeee!',
  'Hang on, adjusting course.',
  'One day I will catch you.',
  'You are a slippery one.',
  'Is this a race? I love races.',
  'Say hi to my dad for me.',
];
let deck: string[] = [];
let bubbleUntil = 0;
let nextBubbleAt = performance.now() + 4000;

function nextPhrase(): string {
  if (deck.length === 0) {
    deck = [...PHRASES];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
  }
  return deck.pop()!;
}

function updateBubble(now: number): void {
  const moving = Math.hypot(vx, vy) > 1.5;
  // Only speak on screen; the rocket is in page coords, so compare against the scroll window.
  const visible = x > 0 && x < innerWidth && y > scrollY + 60 && y < scrollY + innerHeight - 20;
  if (talking) {
    // Finished, or scrolled out of view mid-sentence: drop the bubble and get back to the chase.
    if (now > bubbleUntil || !visible) {
      bubble.classList.remove('show');
      talking = false;
    }
  } else if (moving && visible && now > nextBubbleAt) {
    const text = nextPhrase();
    bubble.textContent = text;
    bubble.classList.add('show');
    talking = true;
    // Reading time scales with the line; never shorter than 3.5s.
    bubbleUntil = now + Math.max(3500, 1800 + text.length * 90);
    nextBubbleAt = bubbleUntil + 7000 + Math.random() * 9000;
  } else if (!moving) {
    // Don't let the timer expire while parked; the next line should come mid-chase.
    nextBubbleAt = Math.max(nextBubbleAt, now + 1500);
  }
  // Undo the rocket's spin so the bubble stays upright, then hang it off the nose-side corner.
  bubble.style.transform = `rotate(${-angle}deg) translate(22px, -46px)`;
}

function frame(now: number): void {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= STEP) {
    step();
    acc -= STEP;
  }
  rocket.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg)`;
  updateBubble(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const cutouts = document.querySelectorAll<HTMLElement>('.cutout');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      cutouts.forEach((el, i) => {
        // Farther layers (bigger index) scroll slower, like a paper diorama.
        el.style.translate = `0 ${(-y * (0.04 + (i % 3) * 0.05)).toFixed(1)}px`;
      });
    },
    { passive: true },
  );
}

// ---------- world high scores (same Neon Function the game uses) ----------
const SCORES_URL = (import.meta.env.VITE_SCORES_URL as string | undefined)?.replace(/\/$/, '');
const list = document.getElementById('scores')!;

async function loadScores(): Promise<void> {
  if (!SCORES_URL) {
    list.innerHTML = '<li class="empty">Scores are kept locally in this build.</li>';
    return;
  }
  // A cold function answers {"code":"not_loaded"} while it wakes up; retry a few times.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${SCORES_URL}/scores`, { cache: 'no-store' });
      const data = (await res.json()) as unknown;
      if (res.ok && Array.isArray(data)) {
        renderScores(data as { name: string; score: number }[]);
        return;
      }
    } catch {
      /* try again */
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  list.innerHTML = '<li class="empty">The board is asleep. Play a round and wake it up.</li>';
}

function renderScores(rows: { name: string; score: number }[]): void {
  if (rows.length === 0) {
    list.innerHTML = '<li class="empty">Nobody yet. Be the first name on the board.</li>';
    return;
  }
  list.replaceChildren(
    ...rows.map((row, i) => {
      const li = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = String(i + 1);
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = row.name;
      const score = document.createElement('span');
      score.textContent = String(row.score);
      li.append(rank, name, score);
      return li;
    }),
  );
}
void loadScores();
