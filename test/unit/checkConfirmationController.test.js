/* eslint-disable no-import-assign */
import PageController from '../../src/controllers/pageController.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/asyncRequestApi.js')
vi.mock('../../src/utils/datasetteQueries/endpointAlreadyCollected.js')
vi.mock('../../src/utils/logger.js', () => ({
  default: {
    warn: vi.fn()
  }
}))

describe('CheckConfirmationController', () => {
  let Controller
  let getRequestData
  let endpointAlreadyCollectedForDataset
  let controller
  let req
  let res
  let next
  let sessionValues

  beforeEach(async () => {
    vi.clearAllMocks()
    const asyncRequestApi = await import('../../src/services/asyncRequestApi.js')
    const endpointAlreadyCollected = await import('../../src/utils/datasetteQueries/endpointAlreadyCollected.js')
    const CheckConfirmationController = await import('../../src/controllers/checkConfirmationController.js')
    Controller = CheckConfirmationController.default
    getRequestData = asyncRequestApi.getRequestData
    endpointAlreadyCollectedForDataset = endpointAlreadyCollected.endpointAlreadyCollectedForDataset
    controller = new Controller({ route: '/confirmation' })
    sessionValues = new Map([
      ['upload-method', 'url'],
      ['request_id', 'request-123']
    ])
    req = {
      originalUrl: '/check/confirmation',
      session: {},
      form: { options: {} },
      sessionModel: {
        get: vi.fn(key => sessionValues.get(key)),
        set: vi.fn((key, value) => sessionValues.set(key, value))
      }
    }
    res = {}
    next = vi.fn()
    getRequestData.mockResolvedValue({
      getParams: () => ({
        type: 'check_url',
        url: 'https://example.com/data.csv',
        dataset: 'brownfield-land',
        organisationName: 'local-authority:ABC'
      })
    })
    endpointAlreadyCollectedForDataset.mockResolvedValue(false)
  })

  it('sets request data context and keeps the submit handoff when endpoint is not already collected', async () => {
    const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

    await controller.locals(req, res, next)

    expect(getRequestData).toHaveBeenCalledWith('request-123')
    expect(endpointAlreadyCollectedForDataset).toHaveBeenCalledWith({
      endpointUrl: 'https://example.com/data.csv',
      dataset: 'brownfield-land',
      organisation: 'local-authority:ABC'
    })
    expect(req.sessionModel.set).toHaveBeenCalledWith('dataset', 'brownfield-land')
    expect(req.sessionModel.set).toHaveBeenCalledWith('orgId', 'local-authority:ABC')
    expect(req.form.options.requestId).toBe('request-123')
    expect(req.form.options.alreadyCollectingEndpoint).toBe(false)
    expect(req.session.checkRequestId).toBe('request-123')
    expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
  })

  it('clears the submit handoff when endpoint is already collected for the dataset', async () => {
    req.session.checkRequestId = 'old-request-id'
    endpointAlreadyCollectedForDataset.mockResolvedValue(true)

    await controller.locals(req, res, next)

    expect(req.form.options.alreadyCollectingEndpoint).toBe(true)
    expect(req.session.checkRequestId).toBeUndefined()
  })

  it('keeps current confirmation behaviour when the request is not a URL check', async () => {
    sessionValues.set('upload-method', 'file')

    await controller.locals(req, res, next)

    expect(getRequestData).not.toHaveBeenCalled()
    expect(endpointAlreadyCollectedForDataset).not.toHaveBeenCalled()
    expect(req.form.options.requestId).toBeUndefined()
    expect(req.session.checkRequestId).toBeUndefined()
  })

  it('fails open and keeps the submit handoff when request lookup fails', async () => {
    getRequestData.mockRejectedValue(new Error('API error'))

    await controller.locals(req, res, next)

    expect(req.form.options.requestId).toBe('request-123')
    expect(req.form.options.alreadyCollectingEndpoint).toBeUndefined()
    expect(req.session.checkRequestId).toBe('request-123')
  })
})
