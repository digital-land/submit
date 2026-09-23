import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { createClient } from 'redis'
vi.mock('axios')
vi.mock('redis', () => ({ createClient: vi.fn() }))
vi.mock('../../../config/index.js', () => ({
  default: {
    mainWebsiteUrl: 'https://www.planning.data.gov.uk',
    checkService: { userAgentInternal: 'test' },
    redis: { host: 'localhost', port: 6379 }
  }
}))

describe('fetchDatasets cache', () => {
  let client
  let api
  let entries
  beforeEach(async () => {
    vi.resetModules()
    vi.resetAllMocks()
    entries = new Map()
    client = {
      isOpen: true,
      connect: vi.fn().mockResolvedValue(),
      get: vi.fn(async key => entries.get(key)),
      setEx: vi.fn(async (key, ttl, value) => entries.set(key, value))
    }
    createClient.mockReturnValue(client)
    api = (await import('../../../src/services/platformApi.js')).default
  })

  it('requests the single endpoint without counts and caches for one hour', async () => {
    const data = { dataset: 'tree', typology: 'geography' }
    axios.get.mockResolvedValue({ data })
    const result = await api.fetchDatasets({ dataset: 'tree' })
    expect(result).toEqual({ data, formattedData: [data] })
    expect(await api.fetchDatasets({ dataset: 'tree' })).toEqual(result)
    expect(axios.get).toHaveBeenCalledExactlyOnceWith(
      'https://www.planning.data.gov.uk/dataset/tree.json?exclude_field=entity-count',
      expect.any(Object)
    )
    expect(client.setEx).toHaveBeenCalledExactlyOnceWith(expect.any(String), 3600, JSON.stringify(data))
  })

  it('keeps dataset and list caches separate', async () => {
    axios.get.mockResolvedValueOnce({ data: { dataset: 'tree' } })
      .mockResolvedValueOnce({ data: { dataset: 'other' } })
      .mockResolvedValueOnce({ data: { datasets: [{ dataset: 'tree' }] } })
    await api.fetchDatasets({ dataset: 'tree' })
    await api.fetchDatasets({ dataset: 'other' })
    expect((await api.fetchDatasets()).formattedData).toEqual([{ dataset: 'tree' }])
    expect(entries.size).toBe(3)
    expect(axios.get).toHaveBeenLastCalledWith('https://www.planning.data.gov.uk/dataset.json', expect.any(Object))
  })

  it('encodes names and refetches after Redis removes an expired entry', async () => {
    axios.get.mockResolvedValue({ data: { dataset: 'tree/other' } })
    await api.fetchDatasets({ dataset: 'tree/other' })
    entries.clear()
    await api.fetchDatasets({ dataset: 'tree/other' })
    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(axios.get).toHaveBeenLastCalledWith('https://www.planning.data.gov.uk/dataset/tree%2Fother.json?exclude_field=entity-count', expect.any(Object))
  })

  it.each(['connect', 'get', 'setEx'])('falls back when Redis %s fails', async operation => {
    client[operation].mockRejectedValue(new Error('Redis unavailable'))
    axios.get.mockResolvedValue({ data: { dataset: 'tree' } })
    expect((await api.fetchDatasets({ dataset: 'tree' })).formattedData).toEqual([{ dataset: 'tree' }])
  })

  it('replaces malformed cache entries', async () => {
    client.get.mockResolvedValueOnce('invalid JSON')
    axios.get.mockResolvedValueOnce({ data: { dataset: 'tree' } })
    expect((await api.fetchDatasets({ dataset: 'tree' })).formattedData).toEqual([{ dataset: 'tree' }])
    expect(client.setEx).toHaveBeenCalledOnce()
  })

  it.each([404, 500])('does not cache HTTP %i errors', async status => {
    const error = Object.assign(new Error('API error'), { response: { status } })
    axios.get.mockRejectedValueOnce(error)
    await expect(api.fetchDatasets({ dataset: 'tree' })).rejects.toBe(error)
    expect(client.setEx).not.toHaveBeenCalled()
  })
})
