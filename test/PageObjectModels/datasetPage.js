import BasePage from './BasePage'

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

  async selectDataset (dataSet) {
    return await this.page.getByLabel(dataSet).check()
  }
}
