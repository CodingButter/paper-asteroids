import { defineConfig } from '@neon/config/v1';

export default defineConfig({
  auth: false,
  preview: {
    functions: {
      scores: {
        name: 'paper asteroids leaderboard',
        source: 'api/index.ts',
      },
    },
  },
  branch: (branch) => {
    if (branch.isDefault) return {};
    if (!branch.exists) return { ttl: '7d' };
    return {};
  },
});
