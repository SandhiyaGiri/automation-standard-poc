// Post summary comment (ADF) + PDF attachment to Jira issue JIRA_KEY. Never fails the build.
import { readFileSync } from 'node:fs';

const KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;

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
  const auth = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  const c = await fetch(`${base}/rest/api/3/issue/${s.jiraKey}/comment`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ body: adfComment(s) }),
  });
  if (!c.ok) throw new Error(`comment failed: HTTP ${c.status}`);

  const form = new FormData();
  form.append('file', new Blob([readFileSync('reports/summary.pdf')], { type: 'application/pdf' }), `${s.jiraKey}-build-${s.buildNumber}.pdf`);
  const a = await fetch(`${base}/rest/api/3/issue/${s.jiraKey}/attachments`, {
    method: 'POST',
    headers: { Authorization: auth, 'X-Atlassian-Token': 'no-check' },
    body: form,
  });
  if (!a.ok) throw new Error(`attachment failed: HTTP ${a.status}`);
  console.log(`Jira ${s.jiraKey} updated (comment + PDF)`);

  // Best effort: clear the "queued" marker the poller set. Never fails the report.
  await fetch(`${base}/rest/api/3/issue/${s.jiraKey}`, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ update: { labels: [{ remove: process.env.QUEUED_LABEL ?? 'automation-queued' }] } }),
  }).catch(() => {});
}

if (process.argv[1]?.endsWith('jira-notify.mjs')) {
  // Only status codes / generic messages are logged: never headers or tokens.
  main().catch((e) => { console.error(`jira-notify: ${e.message}`); process.exit(0); });
}
