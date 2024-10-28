// poll the server for the status of the job

import { finishedProcessingStatuses } from '../../utils/utils.js'
import { buttonTexts, headingTexts, messageTexts } from '../../content/statusPage.js'

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

  beginPolling (statusEndpoint) {
    this.pollAttempts = 0

    const interval = setInterval(() => {
      fetch(statusEndpoint)
        .then(res => res.json())
        .then(data => {
          console.info('StatusPage: polled request and got a status of: ' + data.status)
          // ToDo: handle other status' here
          if (finishedProcessingStatuses.includes(data.status)) {
            this.updatePageToComplete()
            clearInterval(interval)
          }
        }).catch((reason) => {
          console.warn(`polling ${statusEndpoint} failed, attempts=${this.pollAttempts}, reason=${reason}`)
          clearInterval(interval)
        })

      this.pollAttempts++
      if (this.pollAttempts >= this.maxPollAttempts) {
        console.info('StatusPage: polling timed out')
        this.updatePageForPollingTimeout()
        clearInterval(interval)
      }
    }, this.pollingInterval)
  }

  updatePageToChecking () {
    // update the page
    this.heading.textContent = headingTexts.checking
    this.processingMessage.textContent = messageTexts.checking
    this.continueButton.style.display = 'none'
  }

  updatePageToComplete () {
    // update the page
    this.heading.textContent = headingTexts.checked
    this.processingMessage.style.display = 'none'
    this.continueButton.textContent = buttonTexts.checked
    this.continueButton.style.display = 'block'
  }

  updatePageForPollingTimeout () {
    // update the page
    this.heading.textContent = this.headingTexts.checking
    this.processingMessage.style.display = 'none'
    this.continueButton.textContent = this.buttonTexts.checking
    this.continueButton.style.display = 'block'
  }
}

window.addEventListener('load', () => {
  const statusPage = new StatusPage()
  statusPage.updatePageToChecking()
  statusPage.beginPolling(window.serverContext.pollingEndpoint)
})
