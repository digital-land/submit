import StatusController from '../../src/controllers/statusController.js'
import { describe, it, vi, expect, beforeEach } from 'vitest'

describe('StatusController', () => {
  vi.mock('@/utils/asyncRequestApi.js')

  let asyncRequestApi
  let statusController

  beforeEach(async () => {
    asyncRequestApi = await import('@/utils/asyncRequestApi')

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
})
