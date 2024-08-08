import { checkS3Bucket, checkRequestApi } from '../../src/routes/health.js'
import AWS from 'aws-sdk'
import { describe, test, expect, vi } from 'vitest'

vi.mock('aws-sdk')
vi.mock('redis')

describe('Health checks', () => {
  test('checkS3Bucket returns true when bucket is reachable', async () => {
    AWS.S3.mockReturnValue({
      headBucket: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({})
      })
    })
    const result = await checkS3Bucket()
    expect(result).toBe(true)
  })

  test('checkS3Bucket returns false when bucket is not reachable', async () => {
    AWS.S3.mockReturnValue({
      headBucket: vi.fn().mockReturnValue({
        promise: vi.fn().mockRejectedValue(new Error())
      })
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
})
