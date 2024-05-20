import BasePage from './BasePage'
import StatusPage from './statusPage'
import fs from 'fs'

export default class UploadFilePage extends BasePage {
  constructor (page) {
    super(page, '/upload')
  }

  async uploadFile (filePath) {
    console.log('file exists?: ', fs.existsSync(filePath))
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.page.getByText('Upload data').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
  }

  async clickContinue (skipVerification) {
    await super.clickContinue()
    console.log('URL is: ', this.page.url())
    return await super.verifyAndReturnPage(StatusPage, skipVerification)
  }
}
