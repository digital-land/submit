// poll the server for the status of the job

import { finishedProcessingStatuses } from '../../utils/utils'

export default class StatusPage {
  constructor (pollingInterval, maxPollAttempts) {
    this.pollingInterval = pollingInterval || 1000
    this.maxPollAttempts = maxPollAttempts || 30
    this.pollAttempts = 0

    this.interval = null
    this.heading = document.querySelector('.js-async-processing-heading')
    this.continueButton = document.querySelector('.js-async-continue-button')
  }

  headingTexts = {
    checkingFile: 'Checking File',
    fileChecked: 'File Checked'
  }

  beginPolling (statusEndpoint, requestId) {
    this.pollAttempts = 0
    const requestEndpoint = `${statusEndpoint}/${requestId}`

    const interval = setInterval(() => {
      fetch(requestEndpoint)
        .then(res => res.json())
        .then(data => {
        // ToDo: handle other status' here
          if (finishedProcessingStatuses.includes(data.status)) {
            this.updatePage()
            clearInterval(interval)
          }
        })

      this.pollAttempts++
      if (window.pollAttempts > this.maxPollAttempts) {
        this.updatePage()
        clearInterval(interval)
      }
    }, this.pollingInterval)
  }

  updatePage () {
    // update the page
    this.heading.textContent = this.headingTexts.fileChecked
    this.continueButton.style.display = 'block'
  }
}

window.addEventListener('load', () => {
  const statusPage = new StatusPage()
  statusPage.beginPolling(window.serverContext.pollingEndpoint, window.serverContext.requestId)
})
