import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Pool } from 'pg';
import { parseEnv } from '@neon/env';
import { attachDatabasePool } from '@neon/functions';
import config from '../neon';

/**
 * Global leaderboard for Paper Asteroids. Runs as a Neon Function next to the
 * database; the static site on GitHub Pages calls it directly.
 */
const { postgres } = parseEnv(config, ['DATABASE_URL']);
const pool = new Pool({ connectionString: postgres.databaseUrl, max: 5 });
attachDatabasePool(pool);

const ready = pool.query(`
  CREATE TABLE IF NOT EXISTS scores (
    id         serial PRIMARY KEY,
    name       text NOT NULL,
    score      integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score DESC, created_at ASC);
`);

const MAX_NAME = 5;
const TOP_N = 10;
// The game awards at most 150 per kill at 45 fps; anything near this is a fake.
const MAX_PLAUSIBLE_SCORE = 250_000;
const POST_COOLDOWN_MS = 5_000;
const lastPostByIp = new Map<string, number>();

const app = new Hono();
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST'] }));

app.get('/', (c) => c.text('paper asteroids leaderboard'));

app.get('/scores', async (c) => {
  await ready;
  const { rows } = await pool.query<{ name: string; score: number }>(
    'SELECT name, score FROM scores ORDER BY score DESC, created_at ASC LIMIT $1',
    [TOP_N],
  );
  return c.json(rows, 200, { 'Cache-Control': 'no-store' });
});

app.post('/scores', async (c) => {
  await ready;
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  if (now - (lastPostByIp.get(ip) ?? 0) < POST_COOLDOWN_MS) {
    return c.json({ error: 'slow down' }, 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'bad json' }, 400);
  }
  const { name, score } = (body ?? {}) as { name?: unknown; score?: unknown };
  const cleanName =
    typeof name === 'string' ? name.replace(/[^A-Za-z0-9?!]/g, '').slice(0, MAX_NAME) : '';
  if (!cleanName) return c.json({ error: 'bad name' }, 400);
  if (!Number.isInteger(score) || (score as number) <= 0 || (score as number) > MAX_PLAUSIBLE_SCORE) {
    return c.json({ error: 'bad score' }, 400);
  }

  lastPostByIp.set(ip, now);
  if (lastPostByIp.size > 10_000) lastPostByIp.clear();

  await pool.query('INSERT INTO scores (name, score) VALUES ($1, $2)', [cleanName, score]);
  const { rows } = await pool.query<{ rank: string }>(
    'SELECT count(*) + 1 AS rank FROM scores WHERE score > $1',
    [score],
  );
  return c.json({ ok: true, rank: Number(rows[0]!.rank) }, 201);
});

export default app;
