// poll the server for the status of the job

import { finishedProcessingStatuses } from '../../utils/utils.js'

export default class StatusPage {
  constructor (pollingInterval, maxPollAttempts) {
    this.pollingInterval = pollingInterval || 1000
    this.maxPollAttempts = maxPollAttempts || 30
    this.pollingOffset = 400
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

  messageTexts = {
    pleaseWait: 'Please wait'
  }

  buttonTexts = {
    continue: 'Continue',
    retrieveLatestStatus: 'Retrieve Latest Status'
  }

  beginPolling (statusEndpoint) {
    this.pollAttempts = 0

    const interval = setInterval(() => {
      fetch(statusEndpoint)
        .then(res => res.json())
        .then(data => {
          console.log('polled request and got a status of: ' + data.status)
          // ToDo: handle other status' here
          if (finishedProcessingStatuses.includes(data.status)) {
            this.updatePageToComplete()
            clearInterval(interval)
          }
        })

      this.pollAttempts++
      if (this.pollAttempts > this.maxPollAttempts) {
        console.log('polling timed out')
        this.updatePageForPollingTimeout()
        clearInterval(interval)
      }
    }, this.pollingInterval)
  }

  updatePageToChecking () {
    // update the page
    this.heading.textContent = this.headingTexts.checkingFile
    this.processingMessage.textContent = this.messageTexts.pleaseWait
    this.continueButton.style.display = 'none'
  }

  updatePageToComplete () {
    // update the page
    this.heading.textContent = this.headingTexts.fileChecked
    this.processingMessage.style.display = 'none'
    this.continueButton.textContent = this.buttonTexts.continue
    this.continueButton.style.display = 'block'
  }

  updatePageForPollingTimeout () {
    // update the page
    this.heading.textContent = this.headingTexts.checkingFile
    this.processingMessage.style.display = 'none'
    this.continueButton.textContent = this.buttonTexts.retrieveLatestStatus
    this.continueButton.style.display = 'block'
  }
}

window.addEventListener('load', () => {
  const statusPage = new StatusPage()
  statusPage.updatePageToChecking()
  statusPage.beginPolling(window.serverContext.pollingEndpoint)
})
