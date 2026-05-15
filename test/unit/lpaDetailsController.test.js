/* eslint-disable no-import-assign */
/* eslint-disable new-cap */

import PageController from '../../src/controllers/pageController.js'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { initDatasetSlugToReadableNameFilter } from '../../src/utils/datasetSlugToReadableName.js'

vi.mock('../../src/utils/datasetteQueries/fetchLocalAuthorities.js')
vi.mock('../../src/services/asyncRequestApi.js')

describe('lpaDetailsController', async () => {
  let fetchLocalAuthorities
  let getRequestData
  let controller

  beforeEach(async () => {
    fetchLocalAuthorities = await import('../../src/utils/datasetteQueries/fetchLocalAuthorities')
    const asyncRequestApi = await import('../../src/services/asyncRequestApi.js')
    getRequestData = asyncRequestApi.getRequestData
    const LpaDetailsController = await import('../../src/controllers/lpaDetailsController.js')
    controller = new LpaDetailsController.default({
      route: '/lpa-details/:requestId'
    })
    await initDatasetSlugToReadableNameFilter()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('locals', () => {
    let req, res, next
    beforeEach(() => {
      req = {
        params: {},
        session: { checkRequestId: 'mock-request-id' },
        form: { options: {} },
        sessionModel: {
          get: vi.fn(() => undefined),
          set: vi.fn()
        }
      }
      res = { redirect: vi.fn() }
      next = vi.fn()
      getRequestData.mockResolvedValue({
        getParams: () => ({ type: 'check_url', organisationName: 'Mock LPA', dataset: 'mock-dataset' })
      })
      fetchLocalAuthorities.fetchLocalAuthorities = vi.fn().mockResolvedValue([])
    })

    it('should set lpa and dataset in session from API response', async () => {
      await controller.locals(req, res, next)

      expect(req.sessionModel.set).toHaveBeenCalledWith('requestId', 'mock-request-id')
      expect(req.sessionModel.set).toHaveBeenCalledWith('lpa', 'Mock LPA')
      expect(req.sessionModel.set).toHaveBeenCalledWith('dataset', 'mock-dataset')
    })

    it('should set localAuthorities options in the form', async () => {
      fetchLocalAuthorities.fetchLocalAuthorities = vi.fn().mockResolvedValue(['Authority 1', 'Authority 2'])

      await controller.locals(req, res, next)

      expect(req.form.options.localAuthorities).toEqual([
        { text: 'Authority 1', value: 'Authority 1' },
        { text: 'Authority 2', value: 'Authority 2' }
      ])
      expect(next).toHaveBeenCalled()
    })

    it('should call super.locals', async () => {
      const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

      await controller.locals(req, res, next)

      expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
      expect(res.redirect).not.toHaveBeenCalled()
    })

    it('should redirect to /check/url when request type is not check_url', async () => {
      getRequestData.mockResolvedValue({
        getParams: () => ({ type: 'check_file' })
      })

      await controller.locals(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/check/url')
      expect(next).not.toHaveBeenCalled()
    })

    it('should redirect to /check/url when getRequestData throws', async () => {
      getRequestData.mockRejectedValue(new Error('API error'))

      await controller.locals(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/check/url')
      expect(next).not.toHaveBeenCalled()
    })
  })
})
