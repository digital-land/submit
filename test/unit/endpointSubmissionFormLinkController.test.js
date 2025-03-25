import { describe, it, vi, expect, beforeEach } from 'vitest'
import EndpointSubmissionFormDeepLinkController from '../../src/controllers/endpointSubmissionFormDeepLinkController.js'

function mockRequestObject () {
  const sessionModel = new Map()
  const journeyModel = new Map()
  return { sessionModel, journeyModel, query: {}, headers: {} }
}

function mockMiddlewareArgs (reqOpts) {
  return {
    req: { ...mockRequestObject(), ...reqOpts },
    res: { redirect: vi.fn() },
    next: vi.fn()
  }
}

describe('EndpointSubmissionFormDeepLinkController', () => {
  let endpointSubmissionFormDeepLinkController

  beforeEach(() => {
    endpointSubmissionFormDeepLinkController = new EndpointSubmissionFormDeepLinkController({
      route: '/deep-link'
    })
  })

  describe('get()', () => {
    it('should throw a 400 error when params invalid', async () => {
      const { req, res, next } = mockMiddlewareArgs({ query: {} })
      endpointSubmissionFormDeepLinkController.get(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/')
    })

    it('should update session with deep link info', async () => {
      const query = { dataset: 'conservation-area', orgName: 'Some Org', orgId: 'some-org' }
      const { req, res, next } = mockMiddlewareArgs({ query })

      endpointSubmissionFormDeepLinkController.get(req, res, next)

      expect(req.sessionModel.get(endpointSubmissionFormDeepLinkController.sessionKey)).toStrictEqual({
        lpa: 'Some Org',
        dataset: 'conservation-area',
        datasetName: 'Conservation area',
        orgId: 'some-org'
      })
      expect(next).toBeCalledTimes(1)
    })
  })
})
