import BasePage from './BasePage'
import DatasetPage from './datasetPage'

export default class StartPage extends BasePage {
  constructor (page) {
    super(page, '/check/link?dataset=brownfield-land&orgName=Adur%20District%20Council&orgId=local-authority%3AADU')
  }

  async clickStartNow (skipVerification) {
    await this.page.click('text=Start now')
    return await super.verifyAndReturnPage(DatasetPage, skipVerification)
  }
}
