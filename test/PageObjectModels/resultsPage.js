/*
    as the errors and no errors template is now both rendered in the results endpoint, we need to combine the two POMs into one for convinience
*/

import { expect } from '@playwright/test'
import BasePage from './BasePage'
import ConfirmationPage from './confirmationPage'

export default class ResultsPage extends BasePage {
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
    expect(['There was a problem with the url provided', "The file you provided wasn't readable"]).toContain(await this.page.locator('h1').innerText())
  }

  async navigateToRequest (id, pageNumber = 0) {
    return await this.page.goto(`${this.url}/${id}/${pageNumber}`)
  }

  async waitForPage (id = undefined) {
    if (id) {
      return await this.page.waitForURL(`**${this.url}/${id}/0`)
    } else {
      return await this.page.waitForURL(`**${this.url}/**/0`)
    }
  }

  async expectPageHasTableAndSummary () {
    // Check if there's a table
    expect(await this.page.locator('table').isVisible())

    await this.page.waitForSelector('.govuk-list.govuk-list--bullet')
    // Get the text content of the bullet points
    const summarytext = await this.page.evaluate(() => {
      const bulletPoints = Array.from(document.querySelectorAll('.govuk-list.govuk-list--bullet li'))
      return bulletPoints.map(li => li.textContent.trim())
    })

    // Assert that the summary is generated
    expect(summarytext).toContain('2 geometries must be in Well-Known Text (WKT) format')
    expect(summarytext).toContain('3 start dates must be a real date')
  }

  async selectLabel (label) {
    return await this.page.getByLabel(label).check()
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()
    return await super.verifyAndReturnPage(ConfirmationPage, skipVerification)
  }
}
