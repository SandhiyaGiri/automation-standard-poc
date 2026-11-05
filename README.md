# automation-standard-poc

BDD test framework (Cucumber + Playwright + TypeScript) plus the scripts that report results back to Jira.
Platform side (Jenkins, polling, webhook): [`jira-jenkins-bridge`](https://github.com/SandhiyaGiri/jira-jenkins-bridge).

The system under test is a public demo todo app (`testpages.eviltester.com`). Synthetic data only.

## Run locally

```bash
npm install
npx playwright install chromium
npm test -- --tags "@TODO-ADD"            # one ticket's scenario
npm test -- --tags "@Regression"          # everything
FORCE_FAIL=1 npm test -- --tags "@TODO-ADD"   # demo: forces a failing assertion
npm run typecheck
node --test scripts/                      # unit tests for the reporting scripts
```

`HEADED=1` shows the browser. Reports are written to `reports/` (`cucumber-report.json`, `.html`, screenshots on failure).

## Layout

```
e2e/features/todo/todo.feature     scenarios and tags
e2e/steps/                         step definitions
e2e/pages/TodoPage.ts              page object
e2e/hooks/hooks.ts                 browser lifecycle, screenshot on failure
e2e/support/world.ts               per-scenario world
e2e/framework/config/loadConfig.ts layered config (global -> tenant -> tenant-env), validated with zod
e2e/config/                        global.json, tenants/DEMO.json, environments/DEMO-QA.json
scripts/run-suite.mjs              `npm test` entry (clean reports, run cucumber, keep exit code)
scripts/jira-poll.mjs              find + claim Jira tickets labelled run-automation
scripts/jira-report.mjs            cucumber JSON -> reports/summary.json
scripts/generate-pdf.mjs           summary.json -> reports/summary.pdf
scripts/jira-notify.mjs            PDF + result label + build link (+ optional comment) on the Jira ticket
config/jira-tag-map.json           Jira key -> tag (single source of truth)
Jenkinsfile                        automation-run job
Jenkinsfile.poll                   jira-poller job
```

## Tags

| Jira ticket | Tag |
|---|---|
| KAN-1 | `@TODO-ADD` |
| KAN-2 | `@TODO-COMPLETE` |
| KAN-3 | `@TODO-FILTER` |

All scenarios also carry `@Regression`. To add a ticket: tag the scenario and add one line to `config/jira-tag-map.json`.

## Jenkins parameters (`automation-run`)

| Parameter | Meaning |
|---|---|
| `TAGS` | Cucumber tag expression (validated) |
| `ENV` / `TENANT` | selects config files (`DEMO-QA`) |
| `RETRY` | 0-2, passed to cucumber |
| `JIRA_KEY` | ticket to update (blank = skip Jira) |
| `FORCE_FAIL` | demo only, forces a failure |

Build result = test result. The reporting stage runs in `post { always }`, is wrapped in try/catch, and can never change the result.

## Jira result format

Label `automation-passed|failed|error`, link `Automation #N - STATUS (passed/total passed)`, PDF attachment, optional comment (`JIRA_COMMENT=true`).
Environment for the scripts: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (see `.env.example`; in Jenkins they come from credentials).

## Safety rules in the scripts

- `jira-notify` refuses to publish if the tag that ran is not the tag mapped to that ticket.
- `jira-poll` searches only mapped keys and re-validates keys before use.
- Zero matched scenarios is `NO_TESTS` -> `automation-error`, never PASSED.
- `.env` and secrets are gitignored; `.npmrc` pins the public npm registry.
