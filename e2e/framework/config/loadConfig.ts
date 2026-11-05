import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const schema = z.object({
  tenantName: z.string(),
  baseUrl: z.string().url(),
  timeouts: z.object({ stepMs: z.number().int().positive() }),
  browser: z.object({ headless: z.boolean() }),
});
export type Config = z.infer<typeof schema>;

const readJson = (p: string) => JSON.parse(readFileSync(resolve('e2e/config', p), 'utf8'));

/** Layered: global -> tenant -> tenant-env. Validated by zod. */
export function loadConfig(tenant = process.env.TENANT ?? 'DEMO', env = process.env.ENV ?? 'QA'): Config {
  const merged = {
    ...readJson('global.json'),
    ...readJson(`tenants/${tenant}.json`),
    ...readJson(`environments/${tenant}-${env}.json`),
  };
  return schema.parse(merged);
}
