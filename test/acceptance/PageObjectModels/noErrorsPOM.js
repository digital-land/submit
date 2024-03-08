import BasePage from './BasePage'
import { expect } from '@playwright/test'

export default class noErrorsPOM extends BasePage {
  static dataCorrectResponses = {
    yes: 'Yes',
    no: 'No, I need to fix it'
  }

  constructor (page) {
    super(page, '/no-errors')
  }

  async selectDataCorrect (response) {
    return await this.page.getByLabel(response).check()
  }

  async validateTableIsCorrect (tableRows) {
    // get the rows in the table
    const rowCount = await this.page.locator('table.govuk-table').locator('tr').count()

    expect(rowCount).toEqual(tableRows.length)

    for (let i = 0; i < rowCount; i++) {
      const cellCount = await this.page.locator('table.govuk-table').locator('tr').nth(i).locator('th, td').count()

      expect(cellCount).toEqual(tableRows[i].length)

      for (let j = 0; j < cellCount; j++) {
        const cellText = await this.page.locator('table.govuk-table').locator('tr').nth(i).locator('th, td').nth(j).innerText()
        if (tableRows[i][j] instanceof RegExp) {
          expect(cellText).toMatch(tableRows[i][j])
        } else {
          expect(cellText).toEqual(tableRows[i][j])
        }
      }
    }
  }

  async waitForMapToLoad () {
    await this.page.waitForFunction(() => window.map && window.map.map && window.map.map.loaded()) // eslint-disable-line no-undef
  }
}
