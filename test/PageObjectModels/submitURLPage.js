import BasePage from './BasePage'
import StatusPage from './statusPage'

export default class UploadURLPage extends BasePage {
  constructor (page) {
    super(page, '/url')
  }

  async enterURL (url) {
    await this.page.getByLabel('URL').click()
    await this.page.getByLabel('URL').fill(url)
  }

  async clickContinue () {
    await super.clickContinue()
    await super.verifyAndReturnPage(StatusPage)
  }
}
