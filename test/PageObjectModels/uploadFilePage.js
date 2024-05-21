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
    await this.page.waitForTimeout(5000)
    await this.page.screenshot({ path: 'playwright-report/data/screenshot.png', fullPage: true })
    console.log('URL here:', this.page.url())
    return await super.verifyAndReturnPage(StatusPage, skipVerification)
  }
}
