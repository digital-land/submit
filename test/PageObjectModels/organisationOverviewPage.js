import BasePage from './BasePage'
import DatasetOverviewPage from './datasetOverviewPage'

export default class OrganisationOverviewPage extends BasePage {
  constructor (page, options) {
    super(page, `/organisations/${options.organisationId}`)
  }

  async clickOnDataset (organisationId, datasetId) {
    await this.page.click(`a[href="/organisations/${organisationId}/${datasetId}/overview"]`)

    return await super.verifyAndReturnPage(DatasetOverviewPage, false, {
      organisationId, datasetId
    })
  }
}
