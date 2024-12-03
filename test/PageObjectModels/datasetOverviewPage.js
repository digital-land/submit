import BasePage from './BasePage'
import DatasetIssuesPage from './datasetIssuesPage'
import DatasetTablePage from './datasetTablePage'

export default class DatasetOverviewPage extends BasePage {
  constructor (page, options) {
    super(page, `/organisations/${options.organisationId}/${options.datasetId}/overview`)
    this.options = options
  }

  async viewDatasetTable () {
    await this.page.click(`a[href="/organisations/${this.options.organisationId}/${this.options.datasetId}/data"]`)

    return await super.verifyAndReturnPage(DatasetTablePage, false, this.options)
  }

  async viewDatasetIssues () {
    await this.page.click(`a[href="/organisations/${this.options.organisationId}/${this.options.datasetId}"]`)

    return await super.verifyAndReturnPage(DatasetIssuesPage, false, this.options)
  }
}
