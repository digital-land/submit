// poll the server for the status of the job
import config from './config'

class StatusPage {
  constructor () {
    this.interval = null
    this.heading = document.querySelector('.js-async-processing-heading')
    this.continueButton = document.querySelector('.js-async-continue-button')
  }

  headingTexts = {
    checkingFile: 'Checking file',
    fileChecked: 'File Checked'
  }

  beginPolling (statusEndpoint, requestId) {
    const requestEndpoint = `${config.api.requestEndpoint}/${requestId}`
    const interval = setInterval(() => {
      fetch(requestEndpoint)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'COMPLETE') {
            this.updatePage()
            clearInterval(interval)
          }
        })
    }, 1000)
  }

  updatePage () {
    // update the page
    this.heading.textContent = this.headingTexts.fileChecked
    this.continueButton.style.display = 'block'
  }
}

window.onload = () => {
  const statusPage = new StatusPage()
  statusPage.beginPolling(config.api.statusEndpoint, window.serverContext.requestId)
}
