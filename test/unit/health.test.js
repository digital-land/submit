import { checkS3Bucket, checkRequestApi, checkRedis } from '../../src/routes/health.js'
import AWS from 'aws-sdk'
import { createClient } from 'redis'
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

  test('checkRedis returns true when Redis is reachable', async () => {
    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)
    const result = await checkRedis()
    expect(result).toBe(true)
  })

  test('checkRedis returns false when Redis is not reachable', async () => {
    const mockClient = {
      connect: vi.fn().mockRejectedValue(new Error()),
      isOpen: false,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)
    const result = await checkRedis()
    expect(result).toBe(false)
  })
})
