# Paper Asteroids

A paper-cutout Asteroids, originally built in Flash in 2009 by Jelly Sandwitch ltd
(Jamie + Scott). Every sound in the game is the two of us — the heartbeat is
`jamHum` and `scoHum`, the thrust is a mouth noise, the ships are voices.

This is the 2026 rewrite: the original `.fla` was decompiled and ported to
TypeScript + Canvas, running natively in the browser. The original SWF and FLA
live in `original/`.

**Play it:** https://codingbutter.github.io/paper-asteroids/

## Controls

| Key                 | Action |
| ------------------- | ------ |
| ← → / A D           | Rotate |
| ↑ / W               | Thrust |
| Space               | Fire   |
| P                   | Pause  |
| M                   | Mute   |

## Development

```
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # typecheck + production build to dist/
```

## Leaderboard

High scores are global, stored in Postgres on Neon and served by a Neon
Function in `api/` (declared in `neon.ts`). The site reads the endpoint from
`VITE_SCORES_URL`; unset it for local-only scores.

```
neon link            # once, binds this checkout to the Neon project
neon deploy          # bundles api/index.ts and deploys the function
```

Deploys to GitHub Pages on every push to `main` (`.github/workflows/pages.yml`).
