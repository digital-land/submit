import BasePage from './BasePage'
import UploadMethodPage from './uploadMethodPage'

export const geometryTypes = {
  point: 'point',
  polygon: 'polygon'
}

export default class GeometryTypePage extends BasePage {
  constructor (page) {
    super(page, '/geometry-type')
  }

  async selectGeometryType (type) {
    this.currentGeometryType = type
    return await this.page.getByLabel(type).check()
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()

    return await super.verifyAndReturnPage(UploadMethodPage, skipVerification)
  }
}
