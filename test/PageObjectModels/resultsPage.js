/*
    as the errors and no errors template is now both rendered in the results endpoint, we need to combine the two POMs into one for convinience
*/

import { expect } from '@playwright/test'
import NoErrorsPage from './noErrorsPage'
import ErrorsPage from './errorsPage'
import BasePage from './BasePage'

export default class resultsPage extends BasePage {
  constructor (page) {
    super(page, '/results')
    Object.assign(this, new ErrorsPage())
    Object.assign(this, new NoErrorsPage())
  }

  async expectPageIsErrorsPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('Errors')
  }

  async expectPageIsNoErrorsPage () {
    expect(await this.page.locator('h1').innerText()).toEqual('No errors')
  }
}
