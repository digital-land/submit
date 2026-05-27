import { describe, it, vi, expect, beforeEach } from 'vitest'
import StatusController, { shouldShowColumnMapping } from '../../src/controllers/statusController.js'
import { getDatasetFields, isStatutoryDataset } from '../../src/utils/redisLoader.js'

vi.mock('@/services/asyncRequestApi.js')
vi.mock('../../src/utils/redisLoader.js')

describe('StatusController', () => {
  let asyncRequestApi
  let statusController

  beforeEach(async () => {
    asyncRequestApi = await import('@/services/asyncRequestApi')
    vi.mocked(getDatasetFields).mockResolvedValue(['name', 'reference'])
    vi.mocked(isStatutoryDataset).mockResolvedValue(false)

    statusController = new StatusController({
      route: '/status'
    })
  })

  describe('locals', () => {
    it('should attach the result of the request to the req.form.options.data object', async () => {
      const mockResult = { id: 'test_id', status: 'COMPLETE', response: { test: 'test' }, hasErrors: () => false }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      const req = {
        form: {
          options: {}
        },
        params: 'fake_id'
      }

      const res = {}
      const next = vi.fn()

      await statusController.locals(req, res, next)

      expect(req.form.options.data).toBe(mockResult)
      expect(req.form.options.processingComplete).toBe(true)
      expect(req.form.options.pollingEndpoint).toBe(`/api/status/${mockResult.id}`)
      expect(asyncRequestApi.getRequestData).toHaveBeenCalledWith(req.params.id)

      expect(req.form.options.data).toBe(mockResult)
    })
  })

  describe('post', () => {
    it('redirects to column mapping when columns need mapping', async () => {
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ field: 'reference', missing: true }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{ converted_row: { Ref: 'abc' } }]
        })
      })

      const req = { params: { id: '123' } }
      const res = { redirect: vi.fn() }
      const next = vi.fn()

      await statusController.post(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/check/column-mapping/123')
    })

    it('redirects to results when all columns are mapped', async () => {
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ column: 'Reference', field: 'reference' }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{ converted_row: { Reference: 'abc' } }]
        })
      })

      const req = { params: { id: '123' } }
      const res = { redirect: vi.fn() }
      const next = vi.fn()

      await statusController.post(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/check/results/123/1')
    })
  })

  describe('shouldShowColumnMapping', () => {
    it('returns true when expected fields are unmapped and unmapped headings are available', async () => {
      await expect(shouldShowColumnMapping({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ column: 'Name', field: 'name' }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{ converted_row: { Name: 'Name', Ref: 'abc' } }]
        })
      })).resolves.toBe(true)
    })

    it('returns false for statutory datasets', async () => {
      vi.mocked(isStatutoryDataset).mockResolvedValue(true)

      await expect(shouldShowColumnMapping({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ column: 'Name', field: 'name' }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{ converted_row: { Name: 'Name', Ref: 'abc' } }]
        })
      })).resolves.toBe(false)
    })

    it('returns false when expected fields are unmapped but no unmapped headings are available', async () => {
      await expect(shouldShowColumnMapping({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ column: 'Name', field: 'name' }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{ converted_row: { Name: 'abc' } }]
        })
      })).resolves.toBe(false)
    })

    it('returns false when all expected fields are mapped', async () => {
      await expect(shouldShowColumnMapping({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ column: 'Reference', field: 'reference' }, { column: 'Name', field: 'name' }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{ converted_row: { Reference: 'abc', Name: 'Name', Extra: 'extra' } }]
        })
      })).resolves.toBe(false)
    })

    it('returns false when there are other blocking external errors', async () => {
      await expect(shouldShowColumnMapping({
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => ({ organisationName: 'local-authority:TST', dataset: 'test-dataset' }),
        getColumnFieldLog: () => [{ column: 'Name', field: 'name' }],
        fetchResponseDetails: vi.fn().mockResolvedValue({
          getRows: () => [{
            converted_row: { Name: 'Name', Ref: 'abc' },
            issue_logs: [{
              severity: 'error',
              responsibility: 'external',
              field: 'geometry',
              'issue-type': 'invalid geometry'
            }]
          }]
        })
      })).resolves.toBe(false)
    })
  })
})
