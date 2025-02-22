/*
    as the errors and no errors template is now both rendered in the results endpoint, we need to combine the two POMs into one for convinience
*/

import { expect } from '@playwright/test'
import BasePage from './BasePage'
import ConfirmationPage from './confirmationPage'

export default class ResultsPage extends BasePage {
  constructor (page) {
    super(page, '/check/results')
  }

  async expectPageHasTitle () {
    expect(await this.page.locator('h1').innerText()).toEqual('Your data has been checked')
  }

  async expectIsFailedPage () {
    expect(['There was a problem with the url provided', "The file you provided wasn't readable"]).toContain(await this.page.locator('h1').innerText())
  }

  async navigateToRequest (id, pageNumber = 1) {
    return await this.page.goto(`${this.url}/${id}/${pageNumber}`)
  }

  async waitForPage (id = undefined) {
    if (id) {
      return await this.page.waitForURL(`**${this.url}/${id}/1`)
    } else {
      return await this.page.waitForURL(`**${this.url}/**/1`)
    }
  }

  async expectPageHasBlockingTasks () {
    await this.page.waitForSelector('.govuk-tag.govuk-tag--red:text("Must fix")')
  }

  async expectPageHasTabs (jsEnabled = true) {
    await expect(this.page.locator('#map-tab')).toBeVisible()

    if (jsEnabled) {
      await this.page.click('#tab_table-tab')
    }
    await expect(this.page.locator('#table-tab')).toBeVisible()
    await expect(this.page.locator('#table-tab table')).toBeVisible()
  }

  async selectLabel (label) {
    return await this.page.getByLabel(label).check()
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()
    return await super.verifyAndReturnPage(ConfirmationPage, skipVerification)
  }

  async clickUploadNewVersion () {
    return await this.page.getByRole('button', { name: 'Continue' }).click()
  }

  async clickMapTab () {
    if (await isJsEnabled(this.page)) {
      await this.page.locator('a:text("Map")').click() // sometimes the id can be prefixed with tab_ so we use a starts with selector
    } else {
      await this.page.$('a.govuk-tabs__tab[href$="#map-tab"]')
    }
  }

  async clickTableTab () {
    if (await isJsEnabled(this.page)) {
      await this.page.locator('a:text("Dataset table")').click()
    } else {
      await this.page.$('a.govuk-tabs__tab[href$="#table-tab"]')
    }
  }
}

async function isJsEnabled (page) {
  return await page.evaluate(() => typeof window !== 'undefined' && typeof document !== 'undefined')
}
