export default class DownloadButton {
  constructor (document, browserWindow = window) {
    this.document = document
    this.window = browserWindow
    this.components = Array.from(this.document.querySelectorAll('.js-app-c-download-button'))

    if (!this.components.length) {
      return
    }

    this.init()
  }

  init () {
    this.components.forEach(component => {
      const button = component.querySelector('.govuk-button')
      if (!button) {
        return
      }

      button.dataset.originalText = button.textContent.trim()
      button.setAttribute('aria-live', 'polite')
      button.resetTimer = null

      button.addEventListener('click', async (event) => {
        await this.handleDownloadClick(event, button)
      })
    })
  }

  async handleDownloadClick (event, button) {
    event.preventDefault()

    const downloadUrl = button.dataset.downloadUrl || button.getAttribute('href')

    if (!downloadUrl) {
      return
    }

    if (button.dataset.busy === 'true') {
      return
    }

    // Cancel any pending delayed reset before starting new download
    if (button.resetTimer) {
      clearTimeout(button.resetTimer)
      button.resetTimer = null
    }

    this.setLoadingState(button, true)

    try {
      const response = await this.window.fetch(downloadUrl, { credentials: 'same-origin' })

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const contentDisposition = response.headers.get('content-disposition')
      const fileName = this.fileNameFromContentDisposition(contentDisposition) || 'alternative-source-data.csv'

      this.downloadBlob(blob, fileName)
      this.showMessage(button, 'complete')
      button.resetTimer = setTimeout(() => {
        button.resetTimer = null
        this.showMessage(button, 'reset')
      }, 5000)
    } catch (error) {
      console.error('DownloadButton: failed to download file', error)
      this.showMessage(button, 'error')
      button.resetTimer = setTimeout(() => {
        button.resetTimer = null
        this.showMessage(button, 'reset')
      }, 5000)
    } finally {
      this.setLoadingState(button, false)
    }
  }

  setLoadingState (button, isLoading) {
    button.dataset.busy = isLoading ? 'true' : 'false'
    button.setAttribute('aria-busy', isLoading ? 'true' : 'false')

    if (isLoading) {
      button.setAttribute('aria-disabled', 'true')
      button.classList.add('app-c-download-button__button--disabled')
      this.showMessage(button, 'loading')
      return
    }

    button.removeAttribute('aria-disabled')
    button.classList.remove('app-c-download-button__button--disabled')
  }

  showMessage (button, state) {
    const originalText = button.dataset.originalText || 'Download'

    if (state === 'loading') {
      button.textContent = ''
      const spinner = this.document.createElement('span')
      spinner.className = 'app-c-spinner'
      spinner.setAttribute('aria-hidden', 'true')
      const text = this.document.createElement('span')
      text.className = 'app-c-download-button__button-text'
      text.textContent = 'Downloading...'
      button.appendChild(spinner)
      button.appendChild(text)
      return
    }

    if (state === 'complete') {
      button.textContent = 'Download complete'
      return
    }

    if (state === 'error') {
      button.textContent = 'Download failed. Try again'
      return
    }

    button.textContent = originalText
  }

  downloadBlob (blob, fileName) {
    const blobUrl = this.window.URL.createObjectURL(blob)
    const link = this.document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    this.document.body.appendChild(link)
    link.click()
    this.document.body.removeChild(link)
    this.window.URL.revokeObjectURL(blobUrl)
  }

  fileNameFromContentDisposition (headerValue) {
    if (!headerValue) {
      return null
    }

    const quotedMatch = headerValue.match(/filename="([^"]+)"/i)
    if (quotedMatch && quotedMatch[1]) {
      return quotedMatch[1]
    }

    const unquotedMatch = headerValue.match(/filename=([^;]+)/i)
    if (unquotedMatch && unquotedMatch[1]) {
      return unquotedMatch[1].trim()
    }

    return null
  }
}