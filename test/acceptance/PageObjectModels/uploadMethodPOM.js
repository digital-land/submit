import BasePage from './BasePage'

class UploadMethodPOM extends BasePage {
  static uploadMethods = {
    File: '',
    URL: ''
  }

  constructor (page) {
    super(page, '/upload-method')
  }

  async selectUploadMethod (method) {
    return await this.page.getByLabel(method).check()
  }

  async selectUploadMethodAndContinue (method) {
    await this.selectUploadMethod(method)
    await this.clickContinue()
  }
}

module.exports = UploadMethodPOM
