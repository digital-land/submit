/* eslint-disable no-import-assign */
/* eslint-disable new-cap */

import PageController from '../../src/controllers/pageController.js'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { initDatasetSlugToReadableNameFilter } from '../../src/utils/datasetSlugToReadableName.js'

vi.mock('../../src/utils/datasetteQueries/fetchLocalAuthorities.js')

describe('lpaDetailsController', async () => {
  let fetchLocalAuthorities
  let controller

  beforeEach(async () => {
    fetchLocalAuthorities = await import('../../src/utils/datasetteQueries/fetchLocalAuthorities')
    const LpaDetailsController = await import('../../src/controllers/lpaDetailsController.js')
    controller = new LpaDetailsController.default({
      route: '/lpa-details'
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
        form: {
          options: {}
        },
        sessionModel: {
          get: vi.fn((key) => {
            if (key === 'lpa' || key === 'dataset') return 'mock-value'
            return undefined
          })
        }
      }
      res = { redirect: vi.fn() }
      next = vi.fn()
    })

    it('should set localAuthorities options in the form', async () => {
      const localAuthoritiesNames = ['Authority 1', 'Authority 2']

      fetchLocalAuthorities.fetchLocalAuthorities = vi.fn().mockResolvedValue(localAuthoritiesNames)

      await controller.locals(req, res, next)

      expect(fetchLocalAuthorities.fetchLocalAuthorities).toHaveBeenCalled()
      expect(req.form.options.localAuthorities).toEqual([
        { text: 'Authority 1', value: 'Authority 1' },
        { text: 'Authority 2', value: 'Authority 2' }
      ])
      expect(next).toHaveBeenCalled()
    })

    it('should call super.locals', async () => {
      fetchLocalAuthorities.fetchLocalAuthorities = vi.fn().mockResolvedValue([])
      const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

      await controller.locals(req, res, next)

      expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
      expect(res.redirect).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('should redirect when lpa is missing from session', async () => {
      req.sessionModel.get = vi.fn((key) => {
        if (key === 'dataset') return 'mock-value'
        return undefined
      })

      await controller.locals(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/')
      expect(next).not.toHaveBeenCalled()
    })

    it('should redirect when dataset is missing from session', async () => {
      req.sessionModel.get = vi.fn((key) => {
        if (key === 'lpa') return 'mock-value'
        return undefined
      })

      await controller.locals(req, res, next)

      expect(res.redirect).toHaveBeenCalledWith('/')
      expect(next).not.toHaveBeenCalled()
    })
  })
})
