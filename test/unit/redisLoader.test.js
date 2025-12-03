import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { getDatasetNameMap } from '../../src/utils/redisLoader'
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

    const datasetKeys = ['ancient-woodland', 'article-4-direction-area']
    const result = await getDatasetNameMap(datasetKeys)
    expect(fetch).toHaveBeenCalledWith(
      `${config.mainWebsiteUrl}/dataset.json?dataset=ancient-woodland&dataset=article-4-direction-area&field=dataset&field=name&include_typologies=false`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'user-agent': 'Planning Data Provide'
        })
      })
    )
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
    await expect(getDatasetNameMap(['ancient-woodland'])).rejects.toThrow('Failed to fetch datasets from API: Not Found')
  })
})
