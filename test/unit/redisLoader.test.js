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

  it('should namespace cache keys by deployment', async () => {
    const originalDeployTime = process.env.DEPLOY_TIME
    const originalGitCommit = process.env.GIT_COMMIT
    const mockRedisClient = {
      isOpen: false,
      connect: vi.fn().mockImplementation(async () => {
        mockRedisClient.isOpen = true
      }),
      get: vi.fn().mockResolvedValue(null),
      setEx: vi.fn().mockResolvedValue()
    }

    try {
      process.env.DEPLOY_TIME = 'deploy-123'
      process.env.GIT_COMMIT = 'commit-abc'

      vi.resetModules()
      vi.doMock('redis', () => ({
        createClient: vi.fn(() => mockRedisClient)
      }))
      vi.doMock('../../config/index.js', () => ({
        default: {
          redis: {
            secure: false,
            host: 'localhost',
            port: 6379
          },
          mainWebsiteUrl: config.mainWebsiteUrl
        }
      }))

      const { getDatasetNameMap: getDatasetNameMapWithDeploy } = await import('../../src/utils/redisLoader.js')

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          datasets: [{ dataset: 'example-dataset', name: 'Example dataset' }]
        })
      })

      await getDatasetNameMapWithDeploy(['example-dataset'])

      expect(mockRedisClient.get).toHaveBeenCalledWith('deploy-123:dataset:example-dataset')
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'deploy-123:dataset:example-dataset',
        300,
        JSON.stringify({ 'example-dataset': 'Example dataset' })
      )
    } finally {
      process.env.DEPLOY_TIME = originalDeployTime
      process.env.GIT_COMMIT = originalGitCommit
      vi.unmock('redis')
      vi.unmock('../../config/index.js')
      vi.resetModules()
    }
  })
})
