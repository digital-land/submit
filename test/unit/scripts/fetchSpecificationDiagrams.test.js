import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { fetchDiagram, parseArgs, readBaseUrl } from '../../../scripts/fetch-specification-diagrams.js'

vi.mock('axios', () => ({
  default: { get: vi.fn() }
}))

describe('fetch-specification-diagrams', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('parseArgs', () => {
    it('defaults to the public diagrams directory', () => {
      expect(parseArgs([])).toEqual({ outDir: 'public/static/images/diagrams' })
    })

    it('honours --out', () => {
      expect(parseArgs(['--out', 'src/assets/static/images/diagrams']))
        .toEqual({ outDir: 'src/assets/static/images/diagrams' })
    })

    it('throws when --out has no directory', () => {
      expect(() => parseArgs(['--out'])).toThrow('--out requires a directory')
    })
  })

  describe('readBaseUrl', () => {
    it('reads the configured base url without a trailing slash', () => {
      expect(readBaseUrl()).toBe(
        'https://raw.githubusercontent.com/digital-land/specification/refs/heads/main/docs/specification'
      )
    })
  })

  describe('fetchDiagram', () => {
    it('returns the svg source', async () => {
      axios.get.mockResolvedValue({
        headers: { 'content-type': 'image/svg+xml' },
        data: '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
      })

      await expect(fetchDiagram('https://example.com/plan/diagram.svg'))
        .resolves.toBe('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
    })

    // A 404 from raw.githubusercontent that somehow reaches us as a 200 would be an HTML page,
    // and writing that out would leave a broken image in the guidance.
    it('rejects a non-svg content type', async () => {
      axios.get.mockResolvedValue({
        headers: { 'content-type': 'text/html; charset=utf-8' },
        data: '<html>404: Not Found</html>'
      })

      await expect(fetchDiagram('https://example.com/nope/diagram.svg'))
        .rejects.toThrow("expected image/svg+xml but got 'text/html; charset=utf-8'")
    })

    it('rejects a body that is not an svg document', async () => {
      axios.get.mockResolvedValue({
        headers: { 'content-type': 'image/svg+xml' },
        data: ''
      })

      await expect(fetchDiagram('https://example.com/empty/diagram.svg'))
        .rejects.toThrow('response body is not an SVG document')
    })
  })
})
