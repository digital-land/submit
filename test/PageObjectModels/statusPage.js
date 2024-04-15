import BasePage from './BasePage'

export default class StatusPage extends BasePage {
  constructor (page) {
    super(page, '/status')
  }

  async waitForContinueButton () {
    await this.page.waitForSelector('button', { text: 'Continue' })
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
    await this.page.waitForSelector('button', { text: 'Retrieve Latest Status' })
  }

  async clickCheckStatusButton () {
    await this.page.click('button', { text: 'Retrieve Latest Status' })
  }
}
