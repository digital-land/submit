import { describe, it, vi, expect } from 'vitest'
import { getOrganisations, prepareGetOrganisationsTemplateParams } from '../../../src/middleware/organisations.middleware'

describe('organisations.middleware.js', () => {
  describe('prepareGetOrganisationsTemplateParams', () => {
    it('should correctly sort and restructure the data received from datasette, then set them on req.template params', async () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      const datasetteResponse = [
        { name: 'Aardvark Healthcare', organisation: 'Aardvark Healthcare' },
        { name: 'Bath NHS Trust', organisation: 'Bath NHS Trust' },
        { name: 'Bristol Hospital', organisation: 'Bristol Hospital' },
        { name: 'Cardiff Health Board', organisation: 'Cardiff Health Board' },
        { name: 'Derbyshire Healthcare', organisation: 'Derbyshire Healthcare' },
        { name: 'East Sussex NHS Trust', organisation: 'East Sussex NHS Trust' }
      ]

      req.organisations = datasetteResponse
      prepareGetOrganisationsTemplateParams(req, res, next)

      const expectedTemplatePrams = {
        alphabetisedOrgs: {
          A: [
            { name: 'Aardvark Healthcare', organisation: 'Aardvark Healthcare' }
          ],
          B: [
            { name: 'Bath NHS Trust', organisation: 'Bath NHS Trust' },
            { name: 'Bristol Hospital', organisation: 'Bristol Hospital' }
          ],
          C: [
            { name: 'Cardiff Health Board', organisation: 'Cardiff Health Board' }
          ],
          D: [
            { name: 'Derbyshire Healthcare', organisation: 'Derbyshire Healthcare' }
          ],
          E: [
            { name: 'East Sussex NHS Trust', organisation: 'East Sussex NHS Trust' }
          ]
        }
      }

      expect(req.templateParams).toEqual(expectedTemplatePrams)

      expect(next).toHaveBeenCalledOnce()
    })
  })
  it('should call render with the find page and correct template params', async () => {
    const req = {}
    const res = { render: vi.fn() }
    const next = vi.fn()

    req.templateParams = {
      alphabetisedOrgs: {
        A: [
          { name: 'Aardvark Healthcare', organisation: 'Aardvark Healthcare' }
        ],
        B: [
          { name: 'Bath NHS Trust', organisation: 'Bath NHS Trust' },
          { name: 'Bristol Hospital', organisation: 'Bristol Hospital' }
        ],
        C: [
          { name: 'Cardiff Health Board', organisation: 'Cardiff Health Board' }
        ],
        D: [
          { name: 'Derbyshire Healthcare', organisation: 'Derbyshire Healthcare' }
        ],
        E: [
          { name: 'East Sussex NHS Trust', organisation: 'East Sussex NHS Trust' }
        ]
      }
    }

    getOrganisations(req, res, next)

    expect(res.render).toHaveBeenCalledTimes(1)
    expect(res.render).toHaveBeenCalledWith('organisations/find.html', req.templateParams)
  })
})
