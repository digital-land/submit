export default class BasePage {
  constructor (page, url) {
    this.page = page
    this.url = url
  }

  async goBack () {
    return await this.page.getByRole('link', { name: 'Back', exact: true }).click()
  }

  async navigateHere () {
    return await this.page.goto(this.url)
  }

  async clickContinue () {
    return await this.page.getByRole('button', { name: 'Continue' }).click()
  }

  async waitForPage () {
    await this.page.waitForURL(`**${this.url}`)
  }
}
