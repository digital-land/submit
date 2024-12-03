import BasePage from './BasePage'
import OrganisationsPage from './organisationsPage'

export default class LandingPage extends BasePage {
  constructor (page) {
    super(page, '/')
  }

  async clickStartNow () {
    await this.page.click('text=Submit and update your data now')
    return await super.verifyAndReturnPage(OrganisationsPage)
  }
}
