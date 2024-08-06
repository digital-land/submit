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
vi.mock('../../src/services/datasette.js')

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
    it('should call render with the find page', async () => {
      const req = {}
      const res = { render: vi.fn() }
      const next = vi.fn()

      vi.mocked(datasette.runQuery).mockResolvedValue({ formattedData: [] })

      await organisationsController.getOrganisations(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/find.html', expect.objectContaining({
        alphabetisedOrgs: {}
      }))
    })

    it('should correctly sort and restructure the data recieved from datasette, then pass it on to the template', async () => {
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

      vi.mocked(datasette.runQuery).mockResolvedValue({ formattedData: datasetteResponse })

      await organisationsController.getOrganisations(req, res, next)

      expect(res.render).toHaveBeenCalledTimes(1)
      expect(res.render).toHaveBeenCalledWith('organisations/find.html', expect.objectContaining({
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
      }))
    })

    it('should catch errors and pass them onto the next function', async () => {
      const req = {}
      const res = {}
      const next = vi.fn()

      const error = new Error('Test error')

      vi.mocked(datasette.runQuery).mockRejectedValue(error)

      await organisationsController.getOrganisations(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('get-started', () => {
    it.todo('should render the get-started template with the correct params')

    it.todo('should catch and pass errors to the next function')
  })
})
