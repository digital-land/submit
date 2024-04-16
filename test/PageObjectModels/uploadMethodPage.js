import BasePage from './BasePage'
import UploadFilePage from './uploadFilePage'
import SubmitURLPage from './submitURLPage'

export const uploadMethods = {
  File: 'File Upload',
  URL: 'URL'
}

export default class UploadMethodPage extends BasePage {
  constructor (page) {
    super(page, '/upload-method')
  }

  async selectUploadMethod (method) {
    this.currentUploadMethod = method
    return await this.page.getByLabel(method).check()
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()

    if (this.currentUploadMethod === uploadMethods.File) {
      return await super.verifyAndReturnPage(UploadFilePage, skipVerification)
    } else {
      return await super.verifyAndReturnPage(SubmitURLPage, skipVerification)
    }
  }
}
