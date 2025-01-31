import BasePage from './BasePage'

export default class ConfirmationPage extends BasePage {
  constructor (page) {
    super(page, '/check/confirmation')
  }

  async waitForPage () {
    return await super.waitForPage(/^.*\/check\/confirmation(?:#.+)?$/)
  }
}
