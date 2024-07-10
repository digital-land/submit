import ResultsController from '../../src/controllers/resultsController.js'
import { describe, it, vi, expect, beforeEach } from 'vitest'

describe('ResultsController', () => {
  vi.mock('@/utils/asyncRequestApi.js')

  let asyncRequestApi
  let resultsController

  const req = {
    params: { id: 'testId' },
    form: { options: {} },
    session: { template: 'template' }
  }

  beforeEach(async () => {
    asyncRequestApi = await import('@/utils/asyncRequestApi')

    resultsController = new ResultsController({
      route: '/results'
    })
  })

  describe('locals', () => {
    it('should set the template to the errors template if the result has errors', async () => {
      const mockDetails = {
        getErrorSummary: () => ['error summary'],
        getColumns: () => ['columns'],
        getFields: () => ['fields'],
        getFieldMappings: () => 'fieldMappings',
        getRowsWithVerboseColumns: () => ['verbose-columns'],
        getGeometries: () => ['geometries'],
        getPagination: () => 'pagination'
      }

      const mockResult = {
        isFailed: () => false,
        getError: () => 'error',
        hasErrors: () => true,
        isComplete: () => true,
        getParams: () => ('params'),
        getId: () => 'fake_id',
        fetchResponseDetails: () => mockDetails,
        getErrorSummary: () => ['error summary']
      }

      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.locals(req, {}, () => {})
      expect(req.form.options.template).toBe('results/errors')
    })

    it('should set the template to the no-errors template if the result has no errors', async () => {
      const mockDetails = {
        getErrorSummary: () => ['error summary'],
        getColumns: () => ['columns'],
        getFields: () => ['fields'],
        getFieldMappings: () => 'fieldMappings',
        getRowsWithVerboseColumns: () => ['verbose-columns'],
        getGeometries: () => ['geometries'],
        getPagination: () => 'pagination'
      }

      const mockResult = {
        isFailed: () => false,
        getError: () => 'error',
        hasErrors: () => false,
        isComplete: () => true,
        getParams: () => ('params'),
        getId: () => 'fake_id',
        fetchResponseDetails: () => mockDetails,
        getErrorSummary: () => ['error summary']
      }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.locals(req, {}, () => {})
      expect(req.form.options.template).toBe('results/no-errors')
    })

    it('should redirect to the status page if the form is complete', async () => {
      const mockResult = {
        isComplete: () => true,
        isFailed: () => false,
        getParams: () => 'params',
        getErrorSummary: () => (['error summary']),
        getGeometries: () => ['geometries'],
        getColumns: () => (['columns']),
        getRowsWithVerboseColumns: () => (['verbose-columns']),
        getFields: () => (['fields']),
        getFieldMappings: () => ({ fields: 'geometries' }),
        hasErrors: () => false,
        getPagination: () => 'pagination',
        fetchResponseDetails: () => {}
      }

      const res = { redirect: vi.fn() }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.locals(req, res, () => {})

      expect(req.form.options.data).toBe(mockResult)
      expect(req.form.options.requestParams).toBe('params')
      expect(req.form.options.errorSummary).toStrictEqual(['error summary'])
      expect(req.form.options.columns).toStrictEqual(['columns'])
      expect(req.form.options.fields).toStrictEqual(['fields'])
      expect(req.form.options.verboseRows).toStrictEqual(['verbose-columns'])
      expect(req.form.options.geometries).toStrictEqual(['geometries'])
      expect(req.form.options.pagination).toBe('pagination')
      expect(req.form.options.errorSummary).toStrictEqual(['error summary'])
    })
  })

  it("should call next with a 404 error if the result wasn't found", async () => {
    asyncRequestApi.getRequestData = vi.fn().mockImplementation(() => {
      throw new Error('Request not found', { message: 'Request not found', status: 404 })
    })

    const nextMock = vi.fn()
    await resultsController.locals(req, {}, nextMock)
    expect(nextMock).toHaveBeenCalledWith(new Error('Request not found', { message: 'Request not found', status: 404 }), req, {}, nextMock)
  })

  it('should call next with a 500 error if the result processing errored', async () => {
    asyncRequestApi.getRequestData = vi.fn().mockImplementation(() => {
      throw new Error('Unexpected error', { message: 'Unexpected error', status: 500 })
    })

    const nextMock = vi.fn()
    await resultsController.locals(req, {}, nextMock)
    expect(nextMock).toHaveBeenCalledWith(new Error('Unexpected error', { message: 'Unexpected error', status: 500 }), req, {}, nextMock)
  })

  it('should set the template to the errors template if the result has errors', async () => {
    const mockResult = { hasErrors: () => true, isFailed: () => false, isComplete: () => true }
    asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

    await resultsController.locals(req, {}, () => {})
    expect(req.form.options.template).toBe('results/errors')
    expect(resultsController.noErrors(req)).toBe(false)
  })

  it('should set the template to the no-errors template if the result has no errors', async () => {
    const mockResult = { hasErrors: () => false, isFailed: () => false, isComplete: () => true }
    asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

    await resultsController.locals(req, {}, () => {})
    expect(req.form.options.template).toBe('results/no-errors')
    expect(resultsController.noErrors(req)).toBe(true)
  })

  it('should set the template to the failedFileRequest template if the result is failed for a file check', async () => {
    const mockResult = { isFailed: () => true, hasErrors: () => false, isComplete: () => true, getType: () => 'check_file' }
    asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

    await resultsController.locals(req, {}, () => {})
    expect(req.form.options.template).toBe('results/failedFileRequest')
  })

  it('should set the template to the failedUrlRequest template if the result is failed for a url check', async () => {
    const mockResult = { isFailed: () => true, hasErrors: () => false, isComplete: () => true, getType: () => 'check_url' }
    asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

    await resultsController.locals(req, {}, () => {})
    expect(req.form.options.template).toBe('results/failedUrlRequest')
  })

  it('should redirect to the status page if the result is not complete', async () => {
    const mockResult = { isFailed: () => true, hasErrors: () => false, isComplete: () => false }
    asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

    const res = { redirect: vi.fn() }
    await resultsController.locals(req, res, () => {})
    expect(res.redirect).toHaveBeenCalledWith(`/status/${req.params.id}`)
  })
})
