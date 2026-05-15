import { expect } from '@playwright/test'
import BasePage from './BasePage'

export default class ConfirmationPage extends BasePage {
  constructor (page) {
    super(page, '/check/confirmation')
  }

  async waitForPage () {
    return await super.waitForPage(/^.*\/check\/confirmation(?:#.+)?$/)
  }

  async expectProvideDataButtonVisible () {
    await expect(this.page.getByRole('link', { name: 'Provide your data', exact: true })).toBeVisible()
  }

  async expectProvideDataButtonHidden () {
    await expect(this.page.getByRole('link', { name: 'Provide your data', exact: true })).not.toBeVisible()
  }
}
