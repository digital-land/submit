import BasePage from './BasePage'
import GeometryTypePage from './geometryTypePage'
import UploadMethodPage from './uploadMethodPage'

export const datasets = {
  Article_4_direction_area_dataset: 'Article 4 direction area',
  Conservation_area_dataset: 'Conservation area',
  Tree_Preservation_zone: 'Tree preservation zone',
  Listed_building_outline: 'Listed building outline',
  Tree: 'Tree'
}

export default class DatasetPage extends BasePage {
  constructor (page) {
    super(page, '/check/dataset')
  }

  async selectDataset (dataset) {
    this.currentDataset = dataset
    return await this.page.getByLabel(dataset, { exact: true }).check()
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()

    if (this.currentDataset === datasets.Tree) {
      return await super.verifyAndReturnPage(GeometryTypePage, skipVerification)
    } else {
      return await super.verifyAndReturnPage(UploadMethodPage, skipVerification)
    }
  }
}
