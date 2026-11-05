import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { BrowserContext, Page } from 'playwright';
import { loadConfig, type Config } from '../framework/config/loadConfig.ts';
import { TodoPage } from '../pages/TodoPage.ts';

export class AppWorld extends World {
  config: Config = loadConfig();
  context!: BrowserContext;
  page!: Page;
  todo!: TodoPage;

  constructor(opts: IWorldOptions) {
    super(opts);
  }
}
setWorldConstructor(AppWorld);
