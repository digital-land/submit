import BasePage from './BasePage'
import ResultsPage from './resultsPage'

export default class StatusPage extends BasePage {
  constructor (page) {
    super(page, '/check/status')
  }

  async waitForContinueButton () {
    await this.page.waitForSelector('button', { text: 'Continue' })
  }

  async clickContinue () {
    await super.clickContinue()
    return await super.verifyAndReturnPage(ResultsPage)
  }

  async expectPageToBeProcessing () {
    await this.page.waitForSelector('h1', { text: 'Checking File' })
  }

  async expectPageToHaveFinishedProcessing () {
    await this.page.waitForSelector('h1', { text: 'File Checked' })
  }

  async navigateToRequest (id) {
    return await this.page.goto(`${this.url}/${id}`)
  }

  async waitForPage (id = undefined) {
    if (id) {
      return await this.page.waitForURL(`**${this.url}/${id}`)
    } else {
      return await this.page.waitForURL(`**${this.url}/**`)
    }
  }

  async getIdFromUrl () {
    return await this.page.url().split('/').pop()
  }

  async expectCheckStatusButtonToBeVisible () {
    await this.page.waitForSelector('#js-async-continue-button')
  }

  async clickCheckStatusButton () {
    // Keep clicking the Continue button until we navigate to results page
    const maxAttempts = 60 // Try for up to 60 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentUrl = await this.page.url()
      
      // Check if we've navigated to results page
      if (/\/check\/results\/.*/.test(currentUrl)) {
        console.log(`Successfully navigated to results page after ${attempt} attempts`)
        break
      }
      
      // Click the button if it's visible
      if (await this.page.isVisible('#js-async-continue-button')) {
        await this.page.click('#js-async-continue-button', { timeout: 5000 })
        console.log(`Clicked continue button (attempt ${attempt + 1})`)
      }
      
      // Wait 1 second before next attempt
      await this.page.waitForTimeout(1000)
    }
    
    // Final check that we're on the results page
    await this.page.waitForURL(/\/check\/results\/.*/, { timeout: 5000 })
    
    return new ResultsPage(this.page)
  }

  async isCheckStatusButtonVisible () {
    return await this.page.isVisible('#js-async-continue-button')
  }
}
