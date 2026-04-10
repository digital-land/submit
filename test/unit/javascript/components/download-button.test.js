import { beforeEach, describe, expect, it, vi } from 'vitest'
import jsdom from 'jsdom'
import DownloadButton from '../../../../src/assets/js/components/download-button.js'

const flushAsync = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const dispatchClick = (window, element) => {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
}

describe('DownloadButton', () => {
  let window
  let document
  let fetchMock

  beforeEach(() => {
    const dom = new jsdom.JSDOM(`
      <div class="js-app-c-download-button">
        <a class="govuk-button" href="/downloads/alternative.csv" data-download-url="/downloads/alternative.csv">Download</a>
      </div>
    `, { url: 'http://localhost' })

    window = dom.window
    document = window.document

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(new window.Blob(['a,b,c'], { type: 'text/csv' })),
      headers: {
        get: vi.fn().mockReturnValue('attachment; filename="alternative.csv"')
      }
    })

    window.fetch = fetchMock
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
    window.URL.revokeObjectURL = vi.fn()
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('shows spinner while downloading and then shows completion message', async () => {
    const downloadButton = new DownloadButton(document, window)

    const button = document.querySelector('.govuk-button')
    expect(downloadButton).toBeTruthy()

    dispatchClick(window, button)

    expect(fetchMock).toHaveBeenCalledWith('/downloads/alternative.csv', { credentials: 'same-origin' })
    expect(button.getAttribute('aria-busy')).toEqual('true')
    expect(button.innerHTML).toContain('Downloading...')
    expect(button.querySelector('.app-c-spinner')).not.toBeNull()

    await flushAsync()

    expect(button.getAttribute('aria-busy')).toEqual('false')
    expect(button.textContent).toContain('Download complete.')
    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('shows error message when download fails', async () => {
    window.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, headers: { get: vi.fn().mockReturnValue(null) } })

    const downloadButton = new DownloadButton(document, window)

    const button = document.querySelector('.govuk-button')

    expect(downloadButton).toBeTruthy()

    dispatchClick(window, button)
    await flushAsync()

    expect(button.textContent).toContain('Download failed. Try again.')
  })

  it('falls back to href when data-download-url is missing', async () => {
    const button = document.querySelector('.govuk-button')
    button.removeAttribute('data-download-url')

    const downloadButton = new DownloadButton(document, window)

    expect(downloadButton).toBeTruthy()

    dispatchClick(window, button)
    await flushAsync()

    expect(fetchMock).toHaveBeenCalledWith('/downloads/alternative.csv', { credentials: 'same-origin' })
  })
})
