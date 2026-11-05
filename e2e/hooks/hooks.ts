import { Before, After, BeforeAll, AfterAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, type Browser } from 'playwright';
import { mkdirSync } from 'node:fs';
import { loadConfig } from '../framework/config/loadConfig.ts';
import { TodoPage } from '../pages/TodoPage.ts';
import type { AppWorld } from '../support/world.ts';

const config = loadConfig();
let browser: Browser;

setDefaultTimeout(config.timeouts.stepMs);

BeforeAll(async () => {
  browser = await chromium.launch({ headless: !process.env.HEADED && config.browser.headless });
});

AfterAll(async () => {
  await browser?.close();
});

// Fresh context per scenario: todo app keeps state in localStorage, so this isolates tests.
Before(async function (this: AppWorld) {
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
  this.todo = new TodoPage(this.page);
  await this.page.goto(this.config.baseUrl);
});

After(async function (this: AppWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    mkdirSync('reports/screenshots', { recursive: true });
    const png = await this.page.screenshot({ path: `reports/screenshots/${scenario.pickle.id}.png` });
    this.attach(png, 'image/png');
  }
  await this.context.close();
});
