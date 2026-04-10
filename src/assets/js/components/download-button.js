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
    } catch (error) {
      console.error('DownloadButton: failed to download file', error)
      this.showMessage(button, 'error')
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
    const originalText = button.dataset.originalText || 'Download alternative source data (CSV)'

    if (state === 'loading') {
      button.innerHTML = '<span class="app-c-spinner" aria-hidden="true"></span><span class="app-c-download-button__button-text">Downloading...</span>'
      return
    }

    if (state === 'complete') {
      button.textContent = 'Download complete. Check your downloads folder.'
      return
    }

    if (state === 'error') {
      button.textContent = 'We could not download the file. Try again.'
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

    const utf8NameMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8NameMatch && utf8NameMatch[1]) {
      return decodeURIComponent(utf8NameMatch[1])
    }

    const fileNameMatch = headerValue.match(/filename="?([^";]+)"?/i)
    if (fileNameMatch && fileNameMatch[1]) {
      return fileNameMatch[1]
    }

    return null
  }
}
