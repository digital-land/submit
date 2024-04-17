import BasePage from './BasePage'
import { expect } from '@playwright/test'

export default class StatusPage extends BasePage {
  constructor (page) {
    super(page, '/status')
  }

  async waitForContinueButton () {
    await this.page.waitForSelector('button[data-testid="continue-button"]')
  }

  async expectStatusToBe (status) {
    // ToDo: this should wait some time if the status is not immediately as expected.
    expect(await this.page.locator('h1').innerText()).toEqual(status)
  }

  async navigateToRequest (id) {
    return await this.page.goto(`${this.url}/${id}`)
  }
}
