import BasePage from './BasePage'
import OrganisationsPage from './organisationsPage'

export default class LandingPage extends BasePage {
  constructor (page) {
    super(page, '/')
  }

  async clickStartNow () {
    await this.page.click('text=Check and provide data')
    return await super.verifyAndReturnPage(OrganisationsPage)
  }
}
