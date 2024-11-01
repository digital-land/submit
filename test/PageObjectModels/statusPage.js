import BasePage from './BasePage'
import ResultsPage from './resultsPage'

export default class StatusPage extends BasePage {
  constructor (page) {
    super(page, '/check/status')
  }

  async waitForContinueButton () {
    await this.page.waitForSelector('button', { text: 'Continue' })
  }

  async clickContinue () {
    await super.clickContinue()
    return await super.verifyAndReturnPage(ResultsPage)
  }

  async expectPageToBeProcessing () {
    await this.page.waitForSelector('h1', { text: 'Checking File' })
  }

  async expectPageToHaveFinishedProcessing () {
    await this.page.waitForSelector('h1', { text: 'File Checked' })
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

  async getIdFromUrl () {
    return await this.page.url().split('/').pop()
  }

  async expectCheckStatusButtonToBeVisible () {
    await this.page.waitForSelector('#js-async-continue-button')
  }

  async clickCheckStatusButton () {
    await this.page.click('#js-async-continue-button')
    return await super.verifyAndReturnPage(ResultsPage)
  }
}
