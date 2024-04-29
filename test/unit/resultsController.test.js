import ResultsController from '../../src/controllers/resultsController.js'
import { describe, it, vi, expect, beforeEach } from 'vitest'

describe('ResultsController', () => {
  vi.mock('@/utils/asyncRequestApi.js')

  let asyncRequestApi
  let resultsController

  const req = {
    params: { id: 'testId' },
    form: { options: {} }
  }

  beforeEach(async () => {
    asyncRequestApi = await import('@/utils/asyncRequestApi')

    resultsController = new ResultsController({
      route: '/results'
    })
  })

  describe('configure', () => {
    it('should add the result to the controller class', async () => {
      const mockResult = { hasErrors: () => false }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(resultsController.result).toBeDefined()
    })

    it("should call next with a 404 error if the result wasn't found", async () => {
      asyncRequestApi.getRequestData = vi.fn().mockImplementation(() => {
        throw new Error('Request not found', { message: 'Request not found', status: 404 })
      })

      const nextMock = vi.fn()
      await resultsController.configure(req, {}, nextMock)
      expect(nextMock).toHaveBeenCalledWith(new Error('Request not found', { message: 'Request not found', status: 404 }), req, {}, nextMock)
    })

    it('should call next with a 500 error if the result processing errored', async () => {
      asyncRequestApi.getRequestData = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error', { message: 'Unexpected error', status: 500 })
      })

      const nextMock = vi.fn()
      await resultsController.configure(req, {}, nextMock)
      expect(nextMock).toHaveBeenCalledWith(new Error('Unexpected error', { message: 'Unexpected error', status: 500 }), req, {}, nextMock)
    })

    it('should set the template to the errors template if the result has errors', async () => {
      const mockResult = { hasErrors: () => true, isFailed: () => false }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(resultsController.template).toBe('results/errors')
    })

    it('should set the template to the no-errors template if the result has no errors', async () => {
      const mockResult = { hasErrors: () => false, isFailed: () => false }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(resultsController.template).toBe('results/no-errors')
    })

    it('should set the template to the failedRequest template if the result is failed', async () => {
      const mockResult = { isFailed: () => true, hasErrors: () => false }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(resultsController.template).toBe('results/failedRequest')
    })
  })

  describe('locals', () => {
    it('should redirect to the status page if the result is not complete', async () => {
      resultsController.result = {
        isComplete: () => false,
        getParams: () => ({ id: 'testId' }),
        getErrorSummary: () => ({}),
        getRows: () => ({}),
        getGeometryKey: () => 'point',
        getColumns: () => ({}),
        getRowsWithVerboseColumns: () => ({}),
        getFields: () => ({})
      }
      const res = { redirect: vi.fn() }
      await resultsController.locals(req, res, () => {})
      expect(res.redirect).toHaveBeenCalledWith(`/status/${req.params.id}`)
    })

    it('should set the result to the form options if the result is complete', async () => {
      resultsController.result = {
        isComplete: () => true,
        getParams: () => ('params'),
        getErrorSummary: () => (['error summary']),
        getGeometries: () => ['geometries'],
        getColumns: () => (['columns']),
        getRowsWithVerboseColumns: () => (['verbose-columns']),
        getFields: () => (['fields']),
        getFieldMappings: () => ({ fields: 'geometries' }),
        hasErrors: () => false,
        getPagination: () => 'pagination'
      }
      const res = { redirect: vi.fn() }
      await resultsController.locals(req, res, () => {})

      expect(req.form.options.requestParams).toBe('params')
      expect(req.form.options.errorSummary).toStrictEqual(['error summary'])
      expect(req.form.options.columns).toStrictEqual(['columns'])
      expect(req.form.options.fields).toStrictEqual(['fields'])
      expect(req.form.options.verboseRows).toStrictEqual(['verbose-columns'])
      expect(req.form.options.geometries).toStrictEqual(['geometries'])
      expect(req.form.options.pagination).toBe('pagination')
    })
  })

  describe('noErrors', () => {
    it('should return false if the result has errors', () => {
      resultsController.result = { hasErrors: () => true }
      expect(resultsController.noErrors()).toBe(false)
    })

    it('should return true if the result has no errors', () => {
      resultsController.result = { hasErrors: () => false }
      expect(resultsController.noErrors()).toBe(true)
    })
  })
})
