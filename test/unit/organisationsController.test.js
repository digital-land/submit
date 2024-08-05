import { describe, it, vi, expect, beforeEach } from 'vitest'
import organisationsController from '../../src/controllers/OrganisationsController.js'
import performanceDbApi from '../../src/services/performanceDbApi.js'
import datasette from '../../src/services/datasette.js'

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

describe('OrganisationsController.js', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('overview', () => {
    it('should render the overview page', async () => {
      const req = { params: { lpa: 'test-lpa' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      const expectedResponse = {
        name: 'Test LPA',
        datasets: {
          dataset1: { endpoint: 'https://example.com', issue: false, error: false },
          dataset2: { endpoint: null, issue: true, error: false },
          dataset3: { endpoint: 'https://example.com', issue: false, error: true }
        }
      }

      performanceDbApi.getLpaOverview = vi.fn().mockResolvedValue(expectedResponse)

      await organisationsController.getOverview(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/overview.html', expect.objectContaining({
        organisation: { name: 'Test LPA' },
        datasets: expect.arrayContaining([
          { endpoint: 'https://example.com', issue: false, error: false, slug: 'dataset1' },
          { endpoint: null, issue: true, error: false, slug: 'dataset2' },
          { endpoint: 'https://example.com', issue: false, error: true, slug: 'dataset3' }
        ]),
        totalDatasets: 3,
        datasetsWithEndpoints: 2,
        datasetsWithIssues: 1,
        datasetsWithErrors: 1
      }))
    })

    it('should catch and pass errors to the next function', async () => {
      const req = { params: { lpa: 'test-lpa' } }
      const res = { }
      const next = vi.fn()

      const error = new Error('Test error')

      vi.mocked(performanceDbApi.getLpaOverview).mockRejectedValue(error)

      await organisationsController.getOverview(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('find', () => {
    it.todo('should render the find page', () => {

    })

    it.todo('should catch errors and pass them onto the next function')
  })

  describe('get-started', () => {
    it('should render the get-started template with the correct params', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      datasette.runQuery.mockImplementation((query) => {
        if (query.includes('example-lpa')) {
          return {
            formattedData: [
              { name: 'Example LPA' }
            ]
          }
        } else if (query.includes('example-dataset')) {
          return {
            formattedData: [
              { name: 'Example Dataset' }
            ]
          }
        }
      })

      await organisationsController.getGetStarted(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/get-started.html', {
        organisation: { name: 'Example LPA' },
        dataset: { name: 'Example Dataset' }
      })
    })

    it('should catch and pass errors to the next function', async () => {
      const req = { params: { lpa: 'example-lpa', dataset: 'example-dataset' } }
      const res = { render: vi.fn() }
      const next = vi.fn()

      // Mock the datasette.runQuery method to throw an error
      datasette.runQuery.mockImplementation(() => {
        throw new Error('example error')
      })

      await organisationsController.getGetStarted(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
