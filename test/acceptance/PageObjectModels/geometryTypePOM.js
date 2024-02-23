import BasePage from './BasePage'

export default class GeometryTypePOM extends BasePage {
  static geometryTypes = {
    point: 'point',
    polygon: 'polygon'
  }

  constructor (page) {
    super(page, '/geometry-type')
  }

  async selectGeometryType (type) {
    return await this.page.getByLabel(type).check()
  }
}
