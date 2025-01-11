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
    it('should set localAuthorities options in the form', async () => {
      const req = {
        form: {
          options: {}
        }
      }
      const res = {}
      const next = vi.fn()

      const localAuthorities = [
        { id: 'Authority-1', name: 'Authority 1' },
        { id: 'Authority-2', name: 'Authority 2' }
      ]

      fetchLocalAuthorities.fetchLocalAuthoritiesWithIdAndName = vi.fn().mockResolvedValue(localAuthorities)

      await controller.locals(req, res, next)

      expect(fetchLocalAuthorities.fetchLocalAuthoritiesWithIdAndName).toHaveBeenCalled()
      expect(req.form.options.localAuthorities).toEqual([
        { text: 'Authority 1', value: JSON.stringify({ id: 'Authority-1', name: 'Authority 1' }) },
        { text: 'Authority 2', value: JSON.stringify({ id: 'Authority-2', name: 'Authority 2' }) }
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

      fetchLocalAuthorities.fetchLocalAuthoritiesWithIdAndName = vi.fn().mockResolvedValue([])
      const superLocalsSpy = vi.spyOn(PageController.prototype, 'locals')

      await controller.locals(req, res, next)

      expect(superLocalsSpy).toHaveBeenCalledWith(req, res, next)
    })
  })
})
