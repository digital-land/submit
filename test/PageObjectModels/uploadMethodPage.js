import BasePage from './BasePage'
import UploadFilePage from './uploadFilePage'
import SubmitURLPage from './submitURLPage'

export default class UploadMethodPage extends BasePage {
  static uploadMethods = {
    File: 'File Upload',
    URL: 'URL'
  }

  constructor (page) {
    super(page, '/upload-method')
  }

  async selectUploadMethod (method) {
    this.currentUploadMethod = method
    return await this.page.getByLabel(method).check()
  }

  async clickContinue () {
    await super.clickContinue()

    if (this.currentUploadMethod === UploadMethodPage.uploadMethods.File) {
      await super.verifyAndReturnPage(UploadFilePage)
    } else {
      await super.verifyAndReturnPage(SubmitURLPage)
    }
  }
}
