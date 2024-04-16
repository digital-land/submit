import BasePage from './BasePage'
import GeometryTypePage from './geometryTypePage'
import UploadMethodPage from './uploadMethodPage'

export default class DatasetPage extends BasePage {
  static datasets = {
    Article_4_direction_area_dataset: 'Article 4 direction area dataset',
    Conservation_area_dataset: 'Conservation area dataset',
    Tree_Preservation_zone: 'Tree preservation zone dataset',
    Listed_building_outline: 'Listed building outline dataset',
    Tree: 'Tree dataset'
  }

  constructor (page) {
    super(page, '/dataset')
  }

  async selectDataset (dataset) {
    this.currentDataset = dataset
    return await this.page.getByLabel(dataset).check()
  }

  async clickContinue () {
    await super.clickContinue()

    if (this.currentDataset === DatasetPage.datasets.Tree) {
      await super.verifyAndReturnPage(GeometryTypePage)
    } else {
      await super.verifyAndReturnPage(UploadMethodPage)
    }
  }
}
