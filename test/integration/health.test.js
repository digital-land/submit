import request from 'supertest'
import express from 'express'
import router from '../../src/routes/health.js'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import AWS from 'aws-sdk'
import { createClient } from 'redis'
import config from '../../config/index.js'
import datasette from '../../src/services/datasette.js'

const app = express()
app.use('/', router)

vi.mock('aws-sdk')
vi.mock('redis')
vi.mock('../../src/services/datasette.js', () => ({
  default: {
    runQuery: vi.fn()
  }
}))

process.env.GIT_COMMIT = 'test_commit_short'

const mockS3Bucket = (promiseFactory) => {
  AWS.S3.mockImplementation(function () {
    return {
      headBucket: vi.fn().mockReturnValue({
        promise: vi.fn().mockImplementation(promiseFactory)
      })
    }
  })
}

describe('GET health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    config.redis = {
      secure: false,
      host: 'localhost',
      port: 6379
    }
  })

  it('when all services are healthy', async () => {
    mockS3Bucket(() => Promise.resolve({}))

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    datasette.runQuery.mockResolvedValue({ formattedData: [{ 1: 1 }] })

    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body).toHaveProperty('status', 'ok')
    expect(res.body.dependencies).toHaveLength(4)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'datasette')
    expect(res.body.dependencies[2]).toHaveProperty('status')
    expect(res.body.dependencies[3]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[3]).toHaveProperty('status')

    expect(res.body.name).toEqual(config.serviceNames.submit)
    expect(res.body.environment).toEqual(config.environment)
    expect(res.body.version).toEqual('test_commit_short')
    expect(res.body.maintenance).toEqual(config.maintenance.serviceUnavailable)
    expect(res.body.dependencies).toStrictEqual([
      {
        name: 's3-bucket',
        status: 'ok'
      },
      {
        name: 'request-api',
        status: 'ok'
      },
      {
        name: 'datasette',
        status: 'ok'
      },
      {
        name: 'redis',
        status: 'ok',
        required: false
      }
    ])
  })

  it('when s3 bucket is unhealthy', async () => {
    mockS3Bucket(() => Promise.reject(new Error('Bucket does not exist')))

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    datasette.runQuery.mockResolvedValue({ formattedData: [{ 1: 1 }] })
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body).toHaveProperty('status', 'down')
    expect(res.body.dependencies).toHaveLength(4)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status', 'down')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'datasette')
    expect(res.body.dependencies[2]).toHaveProperty('status')
    expect(res.body.dependencies[3]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[3]).toHaveProperty('status')
    expect(res.body.name).toEqual(config.serviceNames.submit)
    expect(res.body.environment).toEqual(config.environment)
    expect(res.body.version).toEqual('test_commit_short')
    expect(res.body.maintenance).toEqual(config.maintenance.serviceUnavailable)
    expect(res.body.dependencies).toStrictEqual([
      {
        name: 's3-bucket',
        status: 'down'
      },
      {
        name: 'request-api',
        status: 'ok'
      },
      {
        name: 'datasette',
        status: 'ok'
      },
      {
        name: 'redis',
        status: 'ok',
        required: false
      }
    ])
  })

  it('when request api is unhealthy', async () => {
    mockS3Bucket(() => Promise.resolve({}))

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request API is down')))
    datasette.runQuery.mockResolvedValue({ formattedData: [{ 1: 1 }] })
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body).toHaveProperty('status', 'down')
    expect(res.body.dependencies).toHaveLength(4)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status', 'down')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'datasette')
    expect(res.body.dependencies[2]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[3]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[3]).toHaveProperty('status', 'ok')
    expect(res.body.name).toEqual(config.serviceNames.submit)
    expect(res.body.environment).toEqual(config.environment)
    expect(res.body.version).toEqual('test_commit_short')
    expect(res.body.maintenance).toEqual(config.maintenance.serviceUnavailable)
    expect(res.body.dependencies).toStrictEqual([
      {
        name: 's3-bucket',
        status: 'ok'
      },
      {
        name: 'request-api',
        status: 'down'
      },
      {
        name: 'datasette',
        status: 'ok'
      },
      {
        name: 'redis',
        status: 'ok',
        required: false
      }
    ])
  })

  it('when redis is unhealthy', async () => {
    mockS3Bucket(() => Promise.resolve({}))

    const mockClient = {
      connect: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      isOpen: false,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    datasette.runQuery.mockResolvedValue({ formattedData: [{ 1: 1 }] })
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body).toHaveProperty('status', 'degraded')
    expect(res.body.dependencies).toHaveLength(4)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'datasette')
    expect(res.body.dependencies[2]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[3]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[3]).toHaveProperty('status', 'down')
    expect(res.body.dependencies[3]).toHaveProperty('required', false)
    expect(res.body.name).toEqual(config.serviceNames.submit)
    expect(res.body.environment).toEqual(config.environment)
    expect(res.body.version).toEqual('test_commit_short')
    expect(res.body.maintenance).toEqual(config.maintenance.serviceUnavailable)
    expect(res.body.dependencies).toStrictEqual([
      {
        name: 's3-bucket',
        status: 'ok'
      },
      {
        name: 'request-api',
        status: 'ok'
      },
      {
        name: 'datasette',
        status: 'ok'
      },
      {
        name: 'redis',
        status: 'down',
        required: false
      }
    ])
  })

  it('when datasette is unhealthy', async () => {
    mockS3Bucket(() => Promise.resolve({}))

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    datasette.runQuery.mockRejectedValue(new Error('Datasette is down'))

    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('status', 'down')
    expect(res.body.dependencies).toStrictEqual([
      {
        name: 's3-bucket',
        status: 'ok'
      },
      {
        name: 'request-api',
        status: 'ok'
      },
      {
        name: 'datasette',
        status: 'down'
      },
      {
        name: 'redis',
        status: 'ok',
        required: false
      }
    ])
  })
})
