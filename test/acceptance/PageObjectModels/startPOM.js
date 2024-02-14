import BasePage from './BasePage'

export default class startPOM extends BasePage {
  constructor (page) {
    super(page, '/start')
  }

  clickStartNow () {
    return this.page.click('text=Start now')
  }
}
