import { describe, expect, it, vi, beforeEach } from 'vitest'
import datasette from '../../../src/services/datasette.js'
import { endpointAlreadyCollectedForDataset } from '../../../src/utils/datasetteQueries/endpointAlreadyCollected.js'

vi.mock('../../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))

describe('endpointAlreadyCollectedForDataset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when Datasette finds a matching active endpoint resource for the dataset', async () => {
    datasette.runQuery.mockResolvedValue({ formattedData: [{ 1: 1 }] })

    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: 'https://example.com/data.csv',
      dataset: 'brownfield-land',
      organisation: 'local-authority:ABC'
    })).resolves.toBe(true)
  })

  it('returns false when Datasette does not find a matching endpoint resource for the dataset', async () => {
    datasette.runQuery.mockResolvedValue({ formattedData: [] })

    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: 'https://example.com/data.csv',
      dataset: 'article-4-direction',
      organisation: 'local-authority:ABC'
    })).resolves.toBe(false)
  })

  it('returns false when the same endpoint URL and dataset belong to a different organisation', async () => {
    datasette.runQuery.mockImplementation(query => ({
      formattedData: query.includes("local-authority:ABC'") ? [{ 1: 1 }] : []
    }))

    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: 'https://example.com/data.csv',
      dataset: 'brownfield-land',
      organisation: 'local-authority:XYZ'
    })).resolves.toBe(false)

    expect(datasette.runQuery.mock.calls[0][0]).toContain("local-authority:XYZ'")
  })

  it('returns true when the same endpoint URL and dataset belong to the same organisation', async () => {
    datasette.runQuery.mockImplementation(query => ({
      formattedData: query.includes("local-authority:ABC'") ? [{ 1: 1 }] : []
    }))

    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: 'https://example.com/data.csv',
      dataset: 'brownfield-land',
      organisation: 'local-authority:ABC'
    })).resolves.toBe(true)
  })

  it('escapes endpoint URL and dataset values in the query', async () => {
    datasette.runQuery.mockResolvedValue({ formattedData: [] })

    await endpointAlreadyCollectedForDataset({
      endpointUrl: "https://example.com/data's.csv",
      dataset: "dataset's",
      organisation: "local-authority:O'RG"
    })

    expect(datasette.runQuery.mock.calls[0][0]).toContain("https://example.com/data''s.csv")
    expect(datasette.runQuery.mock.calls[0][0]).toContain("dataset''s")
    expect(datasette.runQuery.mock.calls[0][0]).toContain("local-authority:O''RG")
  })

  it('does not query Datasette when endpoint URL or dataset is missing', async () => {
    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: '',
      dataset: 'brownfield-land'
    })).resolves.toBe(false)

    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: 'https://example.com/data.csv',
      dataset: ''
    })).resolves.toBe(false)

    expect(datasette.runQuery).not.toHaveBeenCalled()
  })

  it('does not query Datasette when organisation is missing', async () => {
    await expect(endpointAlreadyCollectedForDataset({
      endpointUrl: 'https://example.com/data.csv',
      dataset: 'brownfield-land',
      organisation: ''
    })).resolves.toBe(false)

    expect(datasette.runQuery).not.toHaveBeenCalled()
  })
})
