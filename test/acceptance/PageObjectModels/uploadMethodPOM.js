import BasePage from './BasePage'

export default class UploadMethodPOM extends BasePage {
  static uploadMethods = {
    File: 'File Upload',
    URL: 'URL'
  }

  constructor (page) {
    super(page, '/upload-method')
  }

  async selectUploadMethod (method) {
    return await this.page.getByLabel(method).check()
  }
}
