// poll the server for the status of the job
// Client-side constants, no server dependencies
import { buttonTexts, buttonAriaLabels, headingTexts, messageTexts } from '../../content/statusPage.js'
const finishedProcessingStatuses = [
  'COMPLETE',
  'FAILED'
]

export default class StatusPage {
  constructor (pollingInterval, maxPollAttempts) {
    this.pollingInterval = pollingInterval || 1000
    this.maxPollAttempts = maxPollAttempts || 30
    this.pollingOffset = 400
    this.pollAttempts = 0

    this.interval = null
    this.heading = document.querySelector('#js-async-processing-heading')
    this.processingMessage = document.querySelector('#js-async-processing-message')
    this.secondaryProcessingMessage = document.querySelector('#js-async-processing-secondary-message')
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
            if (data.showColumnMapping) {
              this.updatePageToColumnMapping(data)
            } else {
              this.updatePageToComplete()
            }
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
    this.processingMessage.style.display = 'block'
    this.processingMessage.textContent = messageTexts.checking
    this.hideSecondaryMessage()
    this.continueButton.style.display = 'none'
  }

  updatePageToComplete () {
    // update the page
    this.heading.textContent = headingTexts.checked
    this.processingMessage.style.display = 'none'
    this.hideSecondaryMessage()
    this.continueButton.textContent = buttonTexts.checked
    this.continueButton.ariaLabel = buttonAriaLabels.checked
    this.continueButton.style.display = 'block'
  }

  updatePageToColumnMapping (data) {
    // update the page to show column mapping action
    this.heading.textContent = headingTexts.columnMapping
    this.processingMessage.style.display = 'block'
    this.processingMessage.textContent = messageTexts.columnMapping.primary
    this.showSecondaryMessage(messageTexts.columnMapping.secondary)
    this.continueButton.textContent = buttonTexts.columnMapping
    this.continueButton.ariaLabel = buttonAriaLabels.columnMapping
    this.continueButton.style.display = 'block'
  }

  updatePageForPollingTimeout () {
    // update the page
    this.heading.textContent = headingTexts.checking
    this.processingMessage.style.display = 'block'
    this.processingMessage.textContent = messageTexts.checking
    this.hideSecondaryMessage()
    this.continueButton.textContent = buttonTexts.checking
    this.continueButton.ariaLabel = buttonAriaLabels.checking
    this.continueButton.style.display = 'block'
  }

  hideSecondaryMessage () {
    if (!this.secondaryProcessingMessage) return

    this.secondaryProcessingMessage.textContent = ''
    this.secondaryProcessingMessage.style.display = 'none'
  }

  showSecondaryMessage (message) {
    if (!this.secondaryProcessingMessage) return

    this.secondaryProcessingMessage.textContent = message
    this.secondaryProcessingMessage.style.display = 'block'
  }
}

window.addEventListener('load', () => {
  const statusPage = new StatusPage()
  statusPage.updatePageToChecking()
  statusPage.beginPolling(window.serverContext.pollingEndpoint)
})
