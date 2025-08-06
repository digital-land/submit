import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { getDatasetNameMap } from '../../src/utils/datasetLoader'
import config from '../../config'

describe('getDatasetNameMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch datasets and return a mapping of dataset -> name', async () => {
    const mockApiData = {
      datasets: [
        { dataset: 'ancient-woodland', name: 'Ancient woodland' },
        { dataset: 'article-4-direction-area', name: 'Article 4 direction area' }
      ]
    }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData
    })
    const result = await getDatasetNameMap()
    expect(fetch).toHaveBeenCalledWith(`${config.mainWebsiteUrl}/dataset.json`)
    expect(result).toEqual({
      'ancient-woodland': 'Ancient woodland',
      'article-4-direction-area': 'Article 4 direction area'
    })
  })
  it('should throw an error if the fetch fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    })
    await expect(getDatasetNameMap()).rejects.toThrow('Failed to fetch datasets from API: Not Found')
  })
})
