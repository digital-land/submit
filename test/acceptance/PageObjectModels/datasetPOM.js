import BasePage from './BasePage'

class DatasetPOM extends BasePage {
  static dataSets = {
    Article_4_direction_area_dataset: 'Article 4 direction area dataset',
    Conservation_area_dataset: 'Conservation area dataset',
    Tree_Preservation_zone: 'Tree preservation zone dataset',
    Listed_building_outline: 'Listed building outline dataset'
  }

  constructor (page) {
    super(page, '/dataset')
  }

  async selectDataSet (dataSet) {
    return await this.page.getByLabel(dataSet).check()
  }

  async selectDataSetAndContinue (dataSet) {
    await this.selectDataSet(dataSet)
    await this.clickContinue()
  }
}

module.exports = DatasetPOM
