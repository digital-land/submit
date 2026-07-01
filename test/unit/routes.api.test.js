import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getStatus, getUniqueDatasetFieldsFromQuery } from '../../src/routes/api.js'
import { getRequestData } from '../../src/services/asyncRequestApi.js'
import { shouldShowColumnMapping } from '../../src/services/columnMappingDecider.js'

vi.mock('../../src/services/asyncRequestApi.js', () => ({
  getRequestData: vi.fn()
}))

vi.mock('../../src/services/columnMappingDecider.js', () => ({
  shouldShowColumnMapping: vi.fn()
}))

describe('api routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes dataset fields from the query string into the column mapping decider', async () => {
    const requestData = {
      id: 'request-123',
      status: 'COMPLETE',
      isComplete: () => true,
      isFailed: () => false
    }

    vi.mocked(getRequestData).mockResolvedValue(requestData)
    vi.mocked(shouldShowColumnMapping).mockResolvedValue(true)

    const req = {
      params: { result_id: 'request-123' },
      query: { field: ['reference', 'geometry'] }
    }
    const res = {
      statusCode: 200,
      body: null,
      set: vi.fn(),
      status: vi.fn((statusCode) => {
        res.statusCode = statusCode
        return res
      }),
      json: vi.fn((body) => {
        res.body = body
        return res
      })
    }

    await getStatus(req, res)

    expect(shouldShowColumnMapping).toHaveBeenCalledWith(requestData, ['reference', 'geometry'])
    expect(res.body.showColumnMapping).toBe(true)
    expect(res.body.columnMappingUrl).toBe('/check/column-mapping/request-123')
  })

  it('normalises a single field query parameter to an array', () => {
    expect(getUniqueDatasetFieldsFromQuery({ field: 'reference' })).toEqual(['reference'])
  })
})
