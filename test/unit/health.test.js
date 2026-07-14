import { checkS3Bucket, checkRequestApi, checkDatasette, getStatus } from '../../src/routes/health.js'
import AWS from 'aws-sdk'
import { describe, test, expect, vi } from 'vitest'
import datasette from '../../src/services/datasette.js'

vi.mock('aws-sdk')
vi.mock('redis')
vi.mock('../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))

describe('Health checks', () => {
  test('checkS3Bucket returns true when bucket is reachable', async () => {
    AWS.S3.mockImplementation(function () {
      return {
        headBucket: vi.fn().mockReturnValue({
          promise: vi.fn().mockResolvedValue({})
        })
      }
    })
    const result = await checkS3Bucket()
    expect(result).toBe(true)
  })

  test('checkS3Bucket returns false when bucket is not reachable', async () => {
    AWS.S3.mockImplementation(function () {
      return {
        headBucket: vi.fn().mockReturnValue({
          promise: vi.fn().mockRejectedValue(new Error())
        })
      }
    })
    const result = await checkS3Bucket()
    expect(result).toBe(false)
  })

  test('checkRequestApi returns true when API is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const result = await checkRequestApi()
    expect(result).toBe(true)
  })

  test('checkRequestApi returns false when API is not reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error()))
    const result = await checkRequestApi()
    expect(result).toBe(false)
  })

  test('checkDatasette returns true when Datasette is reachable', async () => {
    datasette.runQuery.mockResolvedValue({ formattedData: [{ 1: 1 }] })

    const result = await checkDatasette()

    expect(datasette.runQuery).toHaveBeenCalledWith('SELECT 1')
    expect(result).toBe(true)
  })

  test('checkDatasette returns false when Datasette is not reachable', async () => {
    datasette.runQuery.mockRejectedValue(new Error())

    const result = await checkDatasette()

    expect(result).toBe(false)
  })

  test('getStatus returns ok when all dependencies are ok', () => {
    const result = getStatus([
      { name: 's3-bucket', status: 'ok' },
      { name: 'request-api', status: 'ok' },
      { name: 'datasette', status: 'ok' },
      { name: 'redis', status: 'ok' }
    ])

    expect(result).toBe('ok')
  })

  test('getStatus returns degraded when only optional Redis is down', () => {
    const result = getStatus([
      { name: 's3-bucket', status: 'ok' },
      { name: 'request-api', status: 'ok' },
      { name: 'datasette', status: 'ok' },
      { name: 'redis', status: 'down', required: false }
    ])

    expect(result).toBe('degraded')
  })

  test('getStatus returns down when any required dependency is down', () => {
    const result = getStatus([
      { name: 's3-bucket', status: 'ok' },
      { name: 'request-api', status: 'ok' },
      { name: 'datasette', status: 'down' },
      { name: 'redis', status: 'down', required: false }
    ])

    expect(result).toBe('down')
  })
})
