import BasePage from './BasePage'
import StatusPage from './statusPage'

export default class SubmitURLPage extends BasePage {
  constructor (page) {
    super(page, '/url')
  }

  async enterURL (url) {
    await this.page.getByLabel('URL').click()
    await this.page.getByLabel('URL').fill(url)
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()
    return await super.verifyAndReturnPage(StatusPage, skipVerification)
  }
}
