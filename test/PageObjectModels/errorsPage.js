import { expect } from '@playwright/test'
import ResultsPage from './resultsPage'

export default class ErrorsPage extends ResultsPage {
  async clickUploadNewVersion () {
    await this.page.getByRole('button', { name: 'Upload a new version' }).click()
  }

  async expectErrorSummaryToContain (errorMessages) {
    for (const errorMessage of errorMessages) {
      expect(await this.page.textContent('.govuk-list')).toContain(errorMessage)
    }
  }
}
