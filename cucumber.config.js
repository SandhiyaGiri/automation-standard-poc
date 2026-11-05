export default {
  import: ['e2e/support/**/*.ts', 'e2e/hooks/**/*.ts', 'e2e/steps/**/*.ts'],
  format: [
    'progress-bar',
    'json:reports/cucumber-report.json',
    'html:reports/cucumber-report.html',
    'rerun:reports/cucumber.rerun',
  ],
  parallel: 0,
  retry: 1,
  retryTagFilter: '@flaky',
};
