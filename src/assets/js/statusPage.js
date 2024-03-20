// poll the server for the status of the job

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
    const requestEndpoint = `${statusEndpoint}/${requestId}`
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

window.addEventListener('load', () => {
  const statusPage = new StatusPage()
  statusPage.beginPolling(window.serverContext.pollingEndpoint, window.serverContext.requestId)
})
