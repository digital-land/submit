/* eslint-disable no-import-assign */

import LpaDetailsController from '../../src/controllers/lpaDetailsController.js'
import { fetchLocalAuthorities } from '../../src/utils/fetchLocalAuthorities'
import PageController from '../../src/controllers/pageController.js'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/utils/fetchLocalAuthorities.js')

describe('lpaDetailsController', () => {
  let controller

  beforeEach(() => {
    controller = new LpaDetailsController({
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
      fetchLocalAuthorities = vi.fn().mockResolvedValue(localAuthoritiesNames)

      await controller.locals(req, res, next)

      expect(fetchLocalAuthorities).toHaveBeenCalled()
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

      fetchLocalAuthorities = vi.fn().mockResolvedValue([])
      const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

      await controller.locals(req, res, next)

      expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
    })
  })
})
