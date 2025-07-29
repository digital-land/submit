import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProcessingController from '../../src/controllers/ProcessingController'

describe('ProcessingController()', () => {
  let req, res, next, controller
  beforeEach(() => {
    req = {
      params: { id: 'test_id' },
      form: {
        options: {}
      }
    }
    res = {
      status: vi.fn(() => res),
      render: vi.fn()
    }
    next = vi.fn()
    controller = new ProcessingController({
      route: '/submit/processing/:id'
    })
  })

  describe('ProcessingController()', () => {
    it('should attach form options to request when requestID provided', () => {
      controller.get = vi.fn(controller.get.bind(controller))
      controller.get(req, res, next)
      expect(req.form.options.requestId).toBe('test_id')
      expect(req.form.options.pollingEndpoint).toBe('/api/status/test_id')
      expect(req.form.options.confirmationUrl).toBe('/submit/confirmation')
      expect(req.form.options.processingComplete).toBe(false)
      expect(req.form.options.headingTexts).toEqual({
        checking: 'We are checking your submission',
        checked: 'Processing complete'
      })
      expect(req.form.options.messageTexts).toEqual({
        checking: 'Larger datasets may take a few minutes. Do not exit this page.',
        checked: 'Your submission has been processed.'
      })
    })
    it('should return 400 when no requestID', () => {
      req.params.id = null
      controller.get(req, res, next)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.render).toHaveBeenCalledWith('error', { message: 'Invalid request ID' })
    })
  })
})
