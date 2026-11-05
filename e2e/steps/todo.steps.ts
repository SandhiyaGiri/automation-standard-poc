import { Given, When, Then } from '@cucumber/cucumber';
import type { AppWorld } from '../support/world.ts';

const split = (csv: string) => csv.split(',').map((s) => s.trim());
type View = 'All' | 'Active' | 'Completed';

Given(/^I add the tasks "([^"]*)"$/, async function (this: AppWorld, csv: string) {
  for (const t of split(csv)) await this.todo.add(t);
});

When(/^I complete the task "([^"]*)"$/, async function (this: AppWorld, t: string) {
  await this.todo.complete(t);
});

When('I clear completed tasks', async function (this: AppWorld) {
  await this.todo.clearCompleted();
});

Then(/^I should see the tasks? "([^"]*)" in the "(All|Active|Completed)" view$/, async function (this: AppWorld, csv: string, view: View) {
  await this.todo.filter(view);
  for (const t of split(csv)) await this.todo.expectVisible(t);
  // Deliberate failure switch for PASS/FAIL demo evidence.
  if (process.env.FORCE_FAIL === '1') await this.todo.expectVisible('__forced_failure__');
});

Then(/^I should not see the task "([^"]*)" in the "(All|Active|Completed)" view$/, async function (this: AppWorld, t: string, view: View) {
  await this.todo.filter(view);
  await this.todo.expectAbsent(t);
});
