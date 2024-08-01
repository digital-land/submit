import { describe, it, vi, expect, beforeEach } from 'vitest'
import LpaOverviewController from '../../src/controllers/LpaOverviewController.js'
import performanceDbApi from '../../src/services/performanceDbApi.js'

vi.mock('../../src/services/performanceDbApi.js')
vi.mock('../../src/utils/utils.js', () => {
  return {
    dataSubjects: {}
  }
})

describe('LpaOverviewController', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should render the lpa overview page', async () => {
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

    await LpaOverviewController.getOverview(req, res, next)

    expect(res.render).toHaveBeenCalledTimes(1)
    expect(res.render).toHaveBeenCalledWith('manage/lpa-overview.html', expect.objectContaining({
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

    await LpaOverviewController.getOverview(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(error)
  })
})
