export interface ScoreEntry {
  name: string;
  score: number;
}

const KEY = 'paperAsteroids.highscores';
export const MAX_ENTRIES = 5;
export const MAX_NAME = 5;

/** Leaderboard endpoint (a Neon Function). Empty => local-only mode. */
const API_URL: string = (import.meta.env.VITE_SCORES_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/**
 * High scores. The Flash original used a SharedObject on the player's machine;
 * this keeps that as a fallback but prefers a shared global board when
 * VITE_SCORES_URL is configured.
 */
export class HighScores {
  entries: ScoreEntry[];
  /** True once the global board has been fetched successfully. */
  online = false;

  constructor() {
    this.entries = this.loadLocal();
    void this.refresh();
  }

  private loadLocal(): ScoreEntry[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) return sanitize(parsed);
      }
    } catch {
      /* corrupt storage: start fresh */
    }
    return [];
  }

  async refresh(): Promise<void> {
    if (!API_URL) return;
    // A cold function answers {"code":"not_loaded"} while it wakes up; retry a few times.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(`${API_URL}/scores`, { cache: 'no-store' });
        const data = (await res.json()) as unknown;
        if (res.ok && Array.isArray(data)) {
          this.entries = sanitize(data);
          this.online = true;
          return;
        }
      } catch {
        /* offline: keep whatever we have */
      }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  /** Does this score earn a spot on the board? */
  qualifies(score: number): boolean {
    if (score <= 0) return false;
    if (this.entries.length < MAX_ENTRIES) return true;
    return score > this.entries[MAX_ENTRIES - 1]!.score;
  }

  add(name: string, score: number): void {
    const entry = { name: name.slice(0, MAX_NAME), score };
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score);
    this.entries = this.entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(this.entries));

    if (API_URL) {
      void fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
        .then(() => this.refresh())
        .catch(() => undefined);
    }
  }
}

function sanitize(list: unknown[]): ScoreEntry[] {
  return list
    .filter((e): e is ScoreEntry => typeof (e as ScoreEntry)?.name === 'string' && typeof (e as ScoreEntry)?.score === 'number')
    .slice(0, MAX_ENTRIES);
}
