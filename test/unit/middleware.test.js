import { describe, it, vi, expect, beforeEach } from 'vitest'
import datasette from '../../src/services/datasette.js'
import * as middleware from '../../src/controllers/middleware.js'

vi.mock('../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))

describe('Middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const baseMw = {
    query: (req) => 'select * from whatever',
    result: 'output'
  }

  describe('fetchOne', () => {
    it('should not apply dataset when option not specified', async () => {
      const mw = middleware.fetchOne(baseMw)
      await mw({}, {}, () => {})
      const queryArgs = datasette.runQuery.mock.calls[0]
      expect(queryArgs[1]).toEqual('digital-land')
    })

    it('should apply dataset overrides via callback', async () => {
      const mw = middleware.fetchOne({
        ...baseMw,
        dataset: (req) => req.datasetName
      })
      await mw({ datasetName: 'fun-dataset' }, {}, () => {})

      const queryArgs = datasette.runQuery.mock.calls[0]
      expect(queryArgs[1]).toEqual('fun-dataset')
    })

    it('should apply dataset overrides from params', async () => {
      const mw = middleware.fetchOne({
        ...baseMw,
        dataset: middleware.FetchOptions.fromParams
      })
      await mw({ params: { dataset: 'fun-dataset' } }, {}, () => {})

      const queryArgs = datasette.runQuery.mock.calls[0]
      expect(queryArgs[1]).toEqual('fun-dataset')
    })

    const mockResponse = () => {
      const res = { status: vi.fn() }
      res.status.mockReturnValue({ render: vi.fn() })
      return res
    }

    it('should call next with error when no records found', async () => {
      const mw = middleware.fetchOne({ ...baseMw })
      vi.mocked(datasette.runQuery).mockResolvedValue({ formattedData: [] })
      const req = { params: {} }
      const res = mockResponse()
      const next = vi.fn()
      await mw(req, res, next)
      expect(next).toBeCalledTimes(0)
      expect(res.status).toHaveBeenCalledWith(404)
      expect(req).toBe(req)
    })

    it('should call next with error when query fails/promise rejected', async () => {
      const mw = middleware.fetchOne({ ...baseMw })

      vi.mocked(datasette.runQuery).mockRejectedValue(new Error('something failed'))
      const req = { params: {} }
      const next = vi.fn()
      const res = mockResponse()
      await mw({}, res, next)
      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(res.status).toBeCalledTimes(0)
      expect(req).toBe(req)
    })
  })

  describe('parallel', async () => {
    it('should succesfully resolve all sub-midlleware', async () => {
      const mw = middleware.parallel([
        middleware.fetchOne({ ...baseMw, result: 'r1' }),
        middleware.fetchOne({ ...baseMw, result: 'r2' })
      ])

      vi.mocked(datasette.runQuery)
        .mockResolvedValueOnce({ formattedData: [{ id: 1 }] })
        .mockResolvedValue({ formattedData: [{ id: 2 }] })
      const req = { params: {} }
      const next = vi.fn()
      await mw(req, {}, next)

      // console.warn(next.mock.calls[0])
      expect(req).toStrictEqual({ ...req, r1: { id: 1 }, r2: { id: 2 } })
      expect(next).toHaveBeenCalledOnce()
    })

    it('should handle promise rejections in "fetch" middleware', async () => {
      const mw = middleware.parallel([
        middleware.fetchOne({ ...baseMw, result: 'r1' }),
        middleware.fetchOne({ ...baseMw, result: 'r2' })
      ])

      vi.mocked(datasette.runQuery)
        .mockResolvedValueOnce({ formattedData: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error('deliberate test failure'))
      const req = { params: {} }
      const next = vi.fn()
      await mw(req, {}, next)

      expect(req).toStrictEqual({ ...req, r1: { id: 1 } })
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it('short circuits with 404 response when fetchOne cannot find any records', async () => {
      const fallbackPolicy = vi.fn()
      const mw = middleware.parallel([
        middleware.fetchOne({ ...baseMw, result: 'r1' }),
        middleware.fetchOne({ ...baseMw, result: 'r2', fallbackPolicy })
      ])

      vi.mocked(datasette.runQuery)
        .mockResolvedValueOnce({ formattedData: [{ id: 1 }] })
        .mockResolvedValue({ formattedData: [] }) // no data -> 404
      const req = { params: {} }
      const next = vi.fn()
      await mw(req, {}, next)

      expect(req).toStrictEqual({ ...req, r1: { id: 1 } })
      expect(next).toHaveBeenCalledTimes(1)
      expect(next).not.toHaveBeenCalledWith(expect.any(Error))
      expect(fallbackPolicy).toHaveBeenCalledOnce()
    })
  })
})
