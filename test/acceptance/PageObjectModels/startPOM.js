import BasePage from './BasePage'

export default class startPOM extends BasePage {
  constructor (page) {
    super(page, '/')
  }

  async clickStartNow () {
    return await this.page.click('text=Start now')
  }
}
