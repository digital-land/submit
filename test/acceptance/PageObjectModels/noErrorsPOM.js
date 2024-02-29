import BasePage from './BasePage'

export default class noErrorsPOM extends BasePage {
  static dataCorrectResponses = {
    yes: 'Yes',
    no: 'No, I need to fix it'
  }

  constructor (page) {
    super(page, '/no-errors')
  }

  async selectDataCorrect (response) {
    return await this.page.getByLabel(response).check()
  }
}
