import { describe, it, vi, expect } from 'vitest'
import { getOverview, prepareOverviewTemplateParams } from '../../../src/middleware/overview.middleware'

// vi.mock('../../../src/services/performanceDbApi.js')

vi.mock('../../../src/utils/utils.js', () => {
  return {
    dataSubjects: {}
  }
})

describe('overview.middleware', () => {
  const exampleLpa = {
    formattedData: [
      { name: 'Example LPA', organisation: 'LPA' }
    ]
  }

  const perfDbApiResponse = {
    name: 'test LPA',
    datasets: {
      dataset1: { endpoint: 'https://example.com', status: 'Live' },
      dataset2: { endpoint: null, status: 'Needs fixing' },
      dataset3: { endpoint: 'https://example.com', status: 'Error' }
    }
  }

  describe('prepareOverviewTemplateParams', () => {
    it('should render the overview page', async () => {
      const req = {
        params: { lpa: 'LPA' },
        orgInfo: exampleLpa.formattedData[0],
        lpaOverview: perfDbApiResponse
      }
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => {})

      const expectedTemplateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: expect.arrayContaining([
          { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1' },
          { endpoint: null, status: 'Needs fixing', slug: 'dataset2' },
          { endpoint: 'https://example.com', status: 'Error', slug: 'dataset3' }
        ]),
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)
    })
  })

  describe('getOverview', () => {
    it('should call render with the correct template and params', () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      req.templateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: [
          { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1' },
          { endpoint: null, status: 'Needs fixing', slug: 'dataset2' },
          { endpoint: 'https://example.com', status: 'Error', slug: 'dataset3' }
        ],
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }

      getOverview(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/overview.html', req.templateParams)
    })
  })
})
