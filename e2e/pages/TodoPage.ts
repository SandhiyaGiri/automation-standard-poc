import { expect, type Page } from '@playwright/test';

type Filter = 'All' | 'Active' | 'Completed';

export class TodoPage {
  constructor(private readonly page: Page) {}

  private input = () => this.page.getByRole('textbox', { name: 'Enter new todo text here' });
  private item = (text: string) => this.page.getByRole('listitem').filter({ hasText: text });

  async add(text: string) {
    await this.input().fill(text);
    await this.input().press('Enter');
  }

  async complete(text: string) {
    await this.item(text).getByRole('checkbox').check();
  }

  async filter(name: Filter) {
    await this.page.getByRole('link', { name, exact: true }).click();
  }

  async clearCompleted() {
    await this.page.getByRole('button', { name: 'Clear completed' }).click();
  }

  async expectVisible(text: string) {
    await expect(this.item(text)).toBeVisible();
  }

  async expectAbsent(text: string) {
    await expect(this.item(text)).toHaveCount(0);
  }
}
