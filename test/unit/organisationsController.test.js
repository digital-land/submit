import { describe, it, vi, expect, beforeEach } from 'vitest'
import organisationsController from '../../src/controllers/OrganisationsController.js'

vi.mock('../../src/services/performanceDbApi.js')
vi.mock('../../src/utils/utils.js', () => {
  return {
    dataSubjects: {}
  }
})

vi.mock('../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))
vi.mock('../../src/utils/issueMessages/getDatasetTaskList.js')

describe('OrganisationsController.js', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('overview', () => {
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

    it('should render the overview page', async () => {
      const req = {
        params: { lpa: 'LPA' },
        orgInfo: exampleLpa.formattedData[0],
        lpaOverview: perfDbApiResponse
      }
      const res = { render: vi.fn() }
      const next = vi.fn()

      organisationsController.prepareOverviewTemplateParams(req, res, () => {})
      organisationsController.getOverview(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/overview.html', expect.objectContaining({
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
      }))
    })
  })
})
