import BasePage from './BasePage'

class UploadFilePOM extends BasePage {
  constructor (page) {
    super(page, '/upload-file')
  }

  async uploadFile (filePath) {
    const fileChooserPromise = this.page.waitForEvent('filechooser')
    await this.page.getByText('Upload data').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(filePath)
  }

  async uploadFileAndContinue (filePath) {
    await this.uploadFile(filePath)
    await this.clickContinue()
  }
}

module.exports = UploadFilePOM
