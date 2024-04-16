import BasePage from './BasePage'
import UploadMethodPage from './uploadMethodPage'
export default class GeometryTypePage extends BasePage {
  static geometryTypes = {
    point: 'point',
    polygon: 'polygon'
  }

  constructor (page) {
    super(page, '/geometry-type')
  }

  async selectGeometryType (type) {
    this.currentGeometryType = type
    return await this.page.getByLabel(type).check()
  }

  async clickContinue () {
    await super.clickContinue()

    await super.verifyAndReturnPage(UploadMethodPage)
  }
}
