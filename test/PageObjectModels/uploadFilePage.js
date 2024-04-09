import BasePage from './BasePage'

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
}
