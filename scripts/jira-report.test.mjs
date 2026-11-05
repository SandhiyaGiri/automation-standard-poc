// Run: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './jira-report.mjs';
import { adfComment } from './jira-notify.mjs';

const sc = (...st) => ({ type: 'scenario', name: 'x', tags: [], steps: st.map((status) => ({ result: { status } })) });

test('passed / failed / skipped / empty', () => {
  assert.equal(summarize([{ elements: [sc('passed', 'passed')] }]).status, 'PASSED');
  const f = summarize([{ elements: [sc('passed', 'failed', 'skipped'), sc('passed')] }]);
  assert.deepEqual([f.status, f.total, f.passed, f.failed, f.skipped], ['FAILED', 2, 1, 1, 0]);
  assert.equal(summarize([{ elements: [sc('passed', 'skipped')] }]).skipped, 1);
  assert.equal(summarize([]).status, 'NO_TESTS');
});

test('adf comment shape', () => {
  const d = adfComment({ jiraKey: 'POC-101', environment: 'QA', tenant: 'DEMO', status: 'PASSED', total: 1, passed: 1, failed: 0, skipped: 0, buildNumber: 3, buildUrl: 'u' });
  assert.equal(d.type, 'doc');
  assert.ok(JSON.stringify(d).includes('Status: PASSED'));
});
