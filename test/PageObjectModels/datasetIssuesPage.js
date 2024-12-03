import BasePage from './BasePage'

export default class DatasetIssuesPage extends BasePage {
  constructor (page, options) {
    super(page, `/organisations/${options.organisationId}/${options.datasetId}`)
  }
}
