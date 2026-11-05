// Entry for `npm test`: clean reports, run cucumber-js, propagate its exit code.
import { spawnSync } from 'node:child_process';
import { rmSync, mkdirSync } from 'node:fs';

rmSync('reports', { recursive: true, force: true });
mkdirSync('reports', { recursive: true });

const args = process.argv.slice(2);
const res = spawnSync(
  'npx',
  ['cucumber-js', '--config', 'cucumber.config.js', ...args, 'e2e/features'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_OPTIONS: '--import=tsx' },
  },
);
process.exit(res.status ?? 1);
