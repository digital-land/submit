// poll the server for the status of the job

import { finishedProcessingStatuses } from '../../utils/utils.js'

export default class StatusPage {
  constructor (pollingInterval, maxPollAttempts) {
    this.pollingInterval = pollingInterval || 1000
    this.maxPollAttempts = maxPollAttempts || 30
    this.pollAttempts = 0

    this.interval = null
    this.heading = document.querySelector('#js-async-processing-heading')
    this.processingMessage = document.querySelector('#js-async-processing-message')
    this.continueButton = document.querySelector('#js-async-continue-button')
  }

  headingTexts = {
    checkingFile: 'Checking File',
    fileChecked: 'File Checked'
  }

  beginPolling (statusEndpoint) {
    this.pollAttempts = 0

    const interval = setInterval(() => {
      fetch(statusEndpoint)
        .then(res => res.json())
        .then(data => {
          console.log(data.status)
          console.log(finishedProcessingStatuses.includes(data.status))
          console.log(finishedProcessingStatuses)
          // ToDo: handle other status' here
          if (finishedProcessingStatuses.includes(data.status)) {
            this.updatePage()
            clearInterval(interval)
          }
        })

      this.pollAttempts++
      if (this.pollAttempts > this.maxPollAttempts) {
        this.updatePage()
        clearInterval(interval)
      }
    }, this.pollingInterval)
  }

  updatePage () {
    // update the page
    this.heading.textContent = this.headingTexts.fileChecked
    this.processingMessage.style.display = 'none'
    this.continueButton.style.display = 'block'
  }
}

window.addEventListener('load', () => {
  const statusPage = new StatusPage()
  statusPage.beginPolling(window.serverContext.pollingEndpoint)
})
