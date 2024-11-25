import BasePage from './BasePage'

export default class DatasetTablePage extends BasePage {
  constructor (page, options) {
    super(page, `/organisations/${options.organisationId}/${options.datasetId}/data`)
  }
}
