/* eslint-disable no-import-assign */
/* eslint-disable new-cap */

import PageController from '../../src/controllers/pageController.js'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/utils/fetchLocalAuthorities.js')

describe('lpaDetailsController', async () => {
  let fetchLocalAuthorities
  let controller

  beforeEach(async () => {
    fetchLocalAuthorities = await import('../../src/utils/fetchLocalAuthorities')
    const LpaDetailsController = await import('../../src/controllers/lpaDetailsController.js')
    controller = new LpaDetailsController.default({
      route: '/lpa-details'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('locals', () => {
    it('should set localAuthorities options in the form', async () => {
      const req = {
        form: {
          options: {}
        }
      }
      const res = {}
      const next = vi.fn()

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
      const req = {
        form: {
          options: {}
        }
      }
      const res = {}
      const next = vi.fn()

      fetchLocalAuthorities.fetchLocalAuthorities = vi.fn().mockResolvedValue([])
      const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

      await controller.locals(req, res, next)

      expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
    })
  })
})
