import ResultsController from '../../src/controllers/resultsController.js'
import { describe, it, vi, expect, beforeEach } from 'vitest'

describe('ResultsController', () => {
  vi.mock('@/utils/publishRequestAPI.js')
  
  let publishRequestApi
  let resultsController

  const req = {
    params: { id: 'testId' },
    form: { options: {} }
  }

  beforeEach(async () => {
    publishRequestApi = await import('@/utils/publishRequestAPI')

    resultsController = new ResultsController({
      route: '/results'
    })
  })

  describe('configure', () => {
    it('should add the result to the controller class', async () => {

      const mockResult = { hasErrors: () => false }
      publishRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(resultsController.result).toBeDefined()
    })

    it("should set the template to the 404 template if the result wasn't found", async () => {
      const mockResult = { response: { error: { code: 404 } } }
      publishRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(req.form.options.template).toBe('404')
    })

    it('should set the template to the generic error template in the result processing errored', async () => {
      const mockResult = { response: { error: { code: 500 } } }
      publishRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(req.form.options.template).toBe('500')
    })

    it('should set the template to the errors template if the result has errors', async () => {
      const mockResult = { hasErrors: () => true }
      publishRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(req.form.options.template).toBe('errors')
    })

    it('should set the template to the no-errors template if the result has no errors', async () => {
      const mockResult = { hasErrors: () => false }
      publishRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await resultsController.configure(req, {}, () => {})
      expect(req.form.options.template).toBe('no-errors')
    })
  })

  describe('locals', () => {
    it('should redirect to the status page if the result is not complete', async () => {
      resultsController.result = { isComplete: () => false }
      const res = { redirect: vi.fn() }
      await resultsController.locals(req, res, () => {})
      expect(res.redirect).toHaveBeenCalledWith(`/status/${req.params.id}`)
    })

    it('should set the result to the form options if the result is complete', async () => {
      resultsController.result = { isComplete: () => true }
      const res = { redirect: vi.fn() }
      await resultsController.locals(req, res, () => {})
      expect(req.form.options.result).toBe(resultsController.result)
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
