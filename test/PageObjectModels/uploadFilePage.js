import BasePage from './BasePage'
import StatusPage from './statusPage'
import fs from 'fs'

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
    await this.page.waitForTimeout(10000)
    const screenshotPath = 'test/datafiles/screenshot.png';
    const screenshotBuffer = await this.page.screenshot();
    fs.writeFileSync(screenshotPath, screenshotBuffer);
    console.log(`Screenshot saved to: ${screenshotPath}`);
    console.log("URL here:",this.page.url())
    return await super.verifyAndReturnPage(StatusPage, skipVerification)
  }
}
