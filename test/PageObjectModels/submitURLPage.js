import BasePage from './BasePage'

export default class SubmitURLPage extends BasePage {
  constructor (page) {
    super(page, '/url')
  }

  async enterURL (url) {
    await this.page.getByLabel('URL').click()
    await this.page.getByLabel('URL').fill(url)
  }
}
