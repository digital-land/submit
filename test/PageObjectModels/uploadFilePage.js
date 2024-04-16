import BasePage from './BasePage'
import StatusPage from './statusPage'

export default class UploadFilePage extends BasePage {
  constructor (page) {
    super(page, '/upload')
  }

  async uploadFile (filePath) {
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.page.getByText('Upload data').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()
    return await super.verifyAndReturnPage(StatusPage, skipVerification)
  }
}
