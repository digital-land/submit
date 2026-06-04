import BasePage from './BasePage'
import OrganisationsPage from './organisationsPage'

export default class LandingPage extends BasePage {
  constructor (page) {
    super(page, '/')
  }

  async clickStartNow () {
    await this.page.click('text=Start now')
    return await super.verifyAndReturnPage(OrganisationsPage)
  }
}
