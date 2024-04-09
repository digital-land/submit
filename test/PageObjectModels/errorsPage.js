import BasePage from './BasePage'
import { expect } from '@playwright/test'

export default class ErrorsPage extends BasePage {
  constructor (page) {
    super(page, '/errors')
  }

  async clickUploadNewVersion () {
    await this.page.getByRole('button', { name: 'Upload a new version' }).click()
  }

  async expectErrorSummaryToContain (errorMessages) {
    for (const errorMessage of errorMessages) {
      expect(await this.page.textContent('.govuk-list')).toContain(errorMessage)
    }
  }
}
