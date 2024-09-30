import { describe, it, vi, expect } from 'vitest'
import { aggregateOverviewData, getOverview, prepareOverviewTemplateParams } from '../../../src/middleware/overview.middleware'

// vi.mock('../../../src/services/performanceDbApi.js')

vi.mock('../../../src/utils/utils.js', () => {
  return {
    dataSubjects: {}
  }
})

describe('overview.middleware', () => {
  const exampleLpa = { name: 'Example LPA', organisation: 'LPA' }

  const perfDbApiResponse = [
    { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1' },
    { endpoint: null, status: 'Needs fixing', dataset: 'dataset2' },
    { endpoint: 'https://example.com', status: 'Error', dataset: 'dataset3' }
  ]

  describe('prepareOverviewTemplateParams', () => {
    it('should render the overview page', async () => {
      const req = {
        params: { lpa: 'LPA' },
        orgInfo: exampleLpa,
        lpaOverview: perfDbApiResponse
      }
      const res = { render: vi.fn() }

      prepareOverviewTemplateParams(req, res, () => {})

      const expectedTemplateParams = {
        organisation: { name: 'Example LPA', organisation: 'LPA' },
        datasets: expect.arrayContaining([
          { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1', error: undefined, issue_count: 0 },
          { endpoint: null, status: 'Needs fixing', slug: 'dataset2', error: undefined, issue_count: 0 },
          { endpoint: 'https://example.com', status: 'Error', slug: 'dataset3', error: undefined, issue_count: 0 }
        ]),
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }

      expect(req.templateParams).toEqual(expectedTemplateParams)
    })
  })

  describe('aggregateOverviewData()', () => {
    it('presents correct number of issues for empty input', () => {
      const aggregatedEmpty = aggregateOverviewData([])
      expect(aggregatedEmpty.length).toBe(0)
    })

    it('counts the issues corretly', () => {
      const exampleData = [
        { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', entity_count: 11 },
        { endpoint: null, status: 'Error', dataset: 'dataset2', entity_count: 12, issue_count: 12 },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', entity_count: 5, issue_count: 5, fields: 'foo' },
        { endpoint: 'https://example.com/3', status: 'Needs fixing', dataset: 'dataset3', entity_count: 5, issue_count: 2, fields: 'bar' }
      ]

      const aggregated = aggregateOverviewData(exampleData)
      aggregated.sort((a, b) => a.slug.localeCompare(b.slug))

      expect(aggregated).toStrictEqual([
        { endpoint: 'https://example.com', status: 'Live', slug: 'dataset1', error: undefined, issue_count: 0 },
        { endpoint: null, status: 'Error', slug: 'dataset2', error: undefined, issue_count: 0 },
        // we want [1 column 'foo' issue] + [2 field 'bar' issue] = 3
        { endpoint: 'https://example.com/3', status: 'Needs fixing', slug: 'dataset3', error: undefined, issue_count: 3 }
      ])
    })

    it('ensures dataset issues get to the surface', () => {
      const exampleData = [
        { endpoint: 'https://example.com', status: 'Live', dataset: 'dataset1', entity_count: 11 },
        { endpoint: null, status: 'Error', dataset: 'dataset1', entity_count: 12, issue_count: 12 },
        { endpoint: 'https://example.com/2', status: 'Live', dataset: 'dataset2', entity_count: 5, issue_count: 5, fields: 'foo' },
        { endpoint: 'https://example.com/2', status: 'Needs fixing', dataset: 'dataset2', entity_count: 5, issue_count: 2, fields: 'bar' }
      ]

      const aggregated = aggregateOverviewData(exampleData)
      aggregated.sort((a, b) => a.slug.localeCompare(b.slug))

      expect(aggregated[0].status).toBe('Error')
      expect(aggregated[1].status).toBe('Needs fixing')
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
