import BasePage from './BasePage'

class UploadURLPOM extends BasePage {
  constructor (page) {
    super(page, '/upload-url')
  }

  async enterURL (url) {
    await this.page.getByLabel('URL').click()
    await this.page.getByLabel('URL').fill(url)
  }

  async enterURLAndContinue (url) {
    await this.enterURL(url)
    await this.clickContinue()
  }
}

module.exports = UploadURLPOM
