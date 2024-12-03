import BasePage from './BasePage'
import OrganisationOverviewPage from './organisationOverviewPage'

export default class OrganisationsPage extends BasePage {
  constructor (page) {
    super(page, '/organisations')
  }

  async searchForOrganisation (organisationName) {
    await this.page.fill('input[id="filter-organisations-list"]', organisationName)
    await this.page.press('input[id="filter-organisations-list"]', 'Enter')
  }

  async selectOrganisation (organisationName, organisationId) {
    await this.page.click(`text=${organisationName}`)

    return await super.verifyAndReturnPage(OrganisationOverviewPage, false, {
      organisationId
    })
  }
}
