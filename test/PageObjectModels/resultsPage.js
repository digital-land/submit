/*
    as the errors and no errors template is now both rendered in the results endpoint, we need to combine the two POMs into one for convinience
*/

import { expect } from '@playwright/test'
import BasePage from './BasePage'

export default class resultsPage extends BasePage {
  constructor (page) {
    super(page, '/results')
  }

  async expectPageIsErrorsPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('Your data has errors')
  }

  async expectPageIsNoErrorsPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('Check your data before you continue')
  }

  async expectIsFailedPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('Request Failed')
  }

  async navigateToRequest (id) {
    return await this.page.goto(`${this.url}/${id}`)
  }

  async waitForPage (id = undefined) {
    if (id) {
      return await this.page.waitForURL(`**${this.url}/${id}`)
    } else {
      return await this.page.waitForURL(`**${this.url}/**`)
    }
  }
}
