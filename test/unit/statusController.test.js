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
    it('configure should make a request and attach the result of that request to the req.form.options object', async () => {
      const req = {
        params: { id: 'test_id' },
        form: {
          options: {}
        }
      }
      const res = { render: vi.fn(), redirect: vi.fn() }
      const next = vi.fn()

      const mockResult = { response: { test: 'test' }, hasErrors: () => false }
      asyncRequestApi.getRequestData = vi.fn().mockResolvedValue(mockResult)

      await statusController.locals(req, res, next)

      expect(asyncRequestApi.getRequestData).toHaveBeenCalledWith(req.params.id)
    })
  })
})
