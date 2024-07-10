import BasePage from './BasePage'
import DatasetPage from './datasetPage'

export default class StartPage extends BasePage {
  constructor (page) {
    super(page, '/')
  }

  async clickStartNow (skipVerification) {
    await this.page.click('text=Start now')
    return await super.verifyAndReturnPage(DatasetPage, skipVerification)
  }
}
