// Poll Jira for tickets labelled TRIGGER_LABEL, claim them, print "KEY|TAG" lines for Jenkins to build.
// Outbound-only: no inbound tunnel/webhook needed. Logs go to stderr, work list to stdout.
import { readFileSync } from 'node:fs';

const KEY_RE = /^[A-Z][A-Z0-9]+-\d+$/;
const TRIGGER = process.env.TRIGGER_LABEL ?? 'run-automation';
const QUEUED = process.env.QUEUED_LABEL ?? 'automation-queued';
const log = (m) => console.error(`jira-poll: ${m}`);

/** Only keys that are well-formed AND mapped to a tag may run; everything else is dropped. */
export function selectWork(keys, tagMap) {
  const run = [];
  const skip = [];
  for (const k of keys) (KEY_RE.test(k) && Object.hasOwn(tagMap, k) ? run : skip).push(k);
  return { run: run.map((k) => [k, tagMap[k]]), skip };
}

async function main() {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) throw new Error('Jira env not configured');
  const tagMap = JSON.parse(readFileSync('config/jira-tag-map.json', 'utf8'));
  const base = JIRA_BASE_URL.replace(/\/$/, '');
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64'),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Bounded JQL: only mapped keys are ever searched.
  const jql = `key in (${Object.keys(tagMap).join(',')}) AND labels = "${TRIGGER}"`;
  const s = await fetch(`${base}/rest/api/3/search/jql`, { method: 'POST', headers, body: JSON.stringify({ jql, fields: ['labels'], maxResults: 20 }) });
  if (!s.ok) throw new Error(`search failed: HTTP ${s.status}`);
  const found = ((await s.json()).issues ?? []).map((i) => i.key);
  const { run, skip } = selectWork(found, tagMap);
  if (skip.length) log(`ignoring unmapped/invalid: ${skip.join(',')}`);

  for (const [key, tag] of run) {
    // Claim first (remove trigger label, add queued label) so a ticket is never picked up twice.
    const c = await fetch(`${base}/rest/api/3/issue/${key}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ update: { labels: [{ remove: TRIGGER }, { add: QUEUED }] } }),
    });
    if (!c.ok) { log(`claim failed for ${key}: HTTP ${c.status}; skipped`); continue; }
    log(`claimed ${key} -> ${tag}`);
    console.log(`${key}|${tag}`);
  }
  if (!found.length) log('nothing to run');
}

if (process.argv[1]?.endsWith('jira-poll.mjs')) {
  // Poll errors must not fail the job noisily every minute; next poll retries.
  main().catch((e) => { log(e.message); process.exit(0); });
}
