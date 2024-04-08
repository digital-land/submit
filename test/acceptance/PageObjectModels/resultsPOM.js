/*
    as the errors and no errors template is now both rendered in the results endpoint, we need to combine the two POMs into one for convinience
*/

import { expect } from '@playwright/test'
import NoErrorsPOM from './noErrorsPOM'
import ErrorsPOM from './errorsPOM'
import BasePage from './BasePage'

export default class resultsPOM extends BasePage {
  constructor (page) {
    super(page, '/results')
    Object.assign(this, new ErrorsPOM())
    Object.assign(this, new NoErrorsPOM())
  }

  async expectPageIsErrorsPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('Errors')
  }

  async expectPageIsNoErrorsPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('No errors')
  }
}
