// Parse reports/cucumber-report.json -> reports/summary.json (status + counts).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function summarize(features) {
  const c = { total: 0, passed: 0, failed: 0, skipped: 0 };
  const scenarios = [];
  for (const f of features) {
    for (const el of f.elements ?? []) {
      if (el.type !== 'scenario') continue; // skip Background
      const st = (el.steps ?? []).map((s) => s.result?.status);
      const status = st.includes('failed')
        ? 'failed'
        : st.some((s) => s !== 'passed')
          ? 'skipped'
          : 'passed';
      c.total++;
      c[status]++;
      scenarios.push({ name: el.name, status, tags: (el.tags ?? []).map((t) => t.name) });
    }
  }
  // ponytail: 0 matched scenarios is NO_TESTS, never PASSED (wrong tag must not look green)
  const status = c.total === 0 ? 'NO_TESTS' : c.failed > 0 ? 'FAILED' : 'PASSED';
  return { status, ...c, scenarios };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('jira-report.mjs')) {
  const src = 'reports/cucumber-report.json';
  const base = existsSync(src) ? summarize(JSON.parse(readFileSync(src, 'utf8'))) : { status: 'NO_REPORT', total: 0, passed: 0, failed: 0, skipped: 0, scenarios: [] };
  const e = process.env;
  const out = {
    ...base,
    jiraKey: e.JIRA_KEY ?? '',
    tags: e.TAGS ?? '',
    environment: e.ENV ?? '',
    tenant: e.TENANT ?? '',
    buildNumber: e.BUILD_NUMBER ?? 'local',
    buildUrl: e.BUILD_URL ?? 'n/a',
    generatedAt: new Date().toISOString(),
  };
  writeFileSync('reports/summary.json', JSON.stringify(out, null, 2));
  console.log(`summary: ${out.status} total=${out.total} passed=${out.passed} failed=${out.failed} skipped=${out.skipped}`);
}
