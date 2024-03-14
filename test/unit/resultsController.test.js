import ResultsController from '../../src/controllers/ResultsController.js'
import { describe, it, vi, expect } from 'vitest'

describe('ResultsController', () => {
  it('should handle complete status', async () => {
    const controller = new ResultsController()
    const req = { params: { result_id: 'complete_test_id' } }
    const res = { render: vi.fn(), redirect: vi.fn() }
    const next = vi.fn()

    // need to mock the api here, with wiremock?

    await controller.get(req, res, next)

    // Assuming your API returns a 'complete' status for 'test_id'
    expect(res.render).toHaveBeenCalled()
    expect(res.redirect).not.toHaveBeenCalled()
  })

  it('should redirect for non-complete status', async () => {
    const controller = new ResultsController()
    const req = { params: { result_id: 'processing_test_id' } }
    const res = { render: vi.fn(), redirect: vi.fn() }
    const next = vi.fn()

    // need to mock the api here
    await controller.get(req, res, next)

    // Assuming your API returns a non-complete status for 'test_id'
    expect(res.redirect).toHaveBeenCalledWith(`/status/${req.params.result_id}`)
    expect(res.render).not.toHaveBeenCalled()
  })
})
