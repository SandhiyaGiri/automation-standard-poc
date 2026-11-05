// Publish run result to Jira issue JIRA_KEY: PDF attachment, result label, build link, optional comment.
// Never fails the build: each step is independent and only logs status codes / generic messages.
import { readFileSync } from 'node:fs';

const KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;
const QUEUED = process.env.QUEUED_LABEL ?? 'automation-queued';
const RESULT_LABELS = ['automation-passed', 'automation-failed', 'automation-error'];

/** Exactly one result label per run; anything not PASSED/FAILED (e.g. NO_TESTS) is an error. */
export function resultLabel(status) {
  return status === 'PASSED' ? 'automation-passed' : status === 'FAILED' ? 'automation-failed' : 'automation-error';
}

export function labelUpdate(status) {
  const add = resultLabel(status);
  return RESULT_LABELS.filter((l) => l !== add).concat(QUEUED).map((remove) => ({ remove })).concat({ add });
}

export function adfComment(s) {
  const lines = [
    'Automation Execution Summary', '',
    `Ticket: ${s.jiraKey}`, `Environment: ${s.environment}`, `Tenant: ${s.tenant}`, `Status: ${s.status}`, '',
    `Total Tests: ${s.total}`, `Passed: ${s.passed}`, `Failed: ${s.failed}`, `Skipped: ${s.skipped}`, '',
    `Jenkins Build: #${s.buildNumber}`, `Build URL: ${s.buildUrl}`, '', 'Execution Report: Attached PDF',
  ];
  return {
    version: 1,
    type: 'doc',
    content: lines.map((t) => ({ type: 'paragraph', content: t ? [{ type: 'text', text: t }] : [] })),
  };
}

async function main() {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  const s = JSON.parse(readFileSync('reports/summary.json', 'utf8'));
  const tagMap = JSON.parse(readFileSync('config/jira-tag-map.json', 'utf8'));

  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) throw new Error('Jira env not configured');
  if (!KEY_RE.test(s.jiraKey)) throw new Error('invalid JIRA_KEY');
  // wrong-ticket guard: tags that ran must be the ones mapped to this ticket
  if (tagMap[s.jiraKey] !== s.tags) throw new Error(`TAGS do not match tag map for ${s.jiraKey}`);

  const base = JIRA_BASE_URL.replace(/\/$/, '');
  const issue = `${base}/rest/api/3/issue/${s.jiraKey}`;
  const auth = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const json = { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' };

  const call = async (name, fn) => {
    try {
      const r = await fn();
      console.log(r.ok ? `jira-notify: ${name} ok` : `jira-notify: ${name} failed: HTTP ${r.status}`);
    } catch (e) {
      console.error(`jira-notify: ${name} failed: ${e.name}`);
    }
  };

  await call('attachment', () => {
    const form = new FormData();
    form.append('file', new Blob([readFileSync('reports/summary.pdf')], { type: 'application/pdf' }), `${s.jiraKey}-build-${s.buildNumber}.pdf`);
    return fetch(`${issue}/attachments`, { method: 'POST', headers: { Authorization: auth, 'X-Atlassian-Token': 'no-check' }, body: form });
  });

  await call('label', () =>
    fetch(issue, { method: 'PUT', headers: json, body: JSON.stringify({ update: { labels: labelUpdate(s.status) } }) }));

  // Same globalId => Jira updates the link in place, so the ticket shows the latest run only.
  if (/^https?:\/\//.test(s.buildUrl)) {
    await call('build link', () =>
      fetch(`${issue}/remotelink`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({
          globalId: 'automation-latest-run',
          object: { url: s.buildUrl, title: `Automation #${s.buildNumber} - ${s.status} (${s.passed}/${s.total} passed)` },
        }),
      }));
  }

  if (process.env.JIRA_COMMENT === 'true') {
    await call('comment', () => fetch(`${issue}/comment`, { method: 'POST', headers: json, body: JSON.stringify({ body: adfComment(s) }) }));
  }
}

if (process.argv[1]?.endsWith('jira-notify.mjs')) {
  main().catch((e) => { console.error(`jira-notify: ${e.message}`); process.exit(0); });
}
