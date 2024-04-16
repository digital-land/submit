import BasePage from './BasePage'
import DatasetPage from './DatasetPage'

export default class StartPage extends BasePage {
  constructor (page) {
    super(page, '/')
  }

  async clickStartNow () {
    await this.page.click('text=Start now')
    await super.verifyAndReturnPage(DatasetPage)
  }
}
