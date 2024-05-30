import request from 'supertest'
import express from 'express'
import router from '../../src/routes/health.js'
import { describe, it, expect, vi } from 'vitest'
import AWS from 'aws-sdk'
import { createClient } from 'redis'
import config from '../../config/index.js'

const app = express()
app.use('/', router)

vi.mock('aws-sdk')
vi.mock('redis')

process.env.GIT_COMMIT = 'test_commit_short'

describe('GET health', () => {
  it('when all services are healthy', async () => {
    AWS.S3.mockReturnValue({
      headBucket: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({})
      })
    })

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body.dependencies).toHaveLength(3)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[2]).toHaveProperty('status')

    expect(res.body.name).toEqual(config.serviceName)
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
        name: 'redis',
        status: 'ok'
      }
    ])
  })

  it('when s3 bucket is unhealthy', async () => {
    AWS.S3.mockReturnValue({
      headBucket: vi.fn().mockRejectedValue(new Error('Bucket does not exist'))
    })

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body.dependencies).toHaveLength(3)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status', 'unhealthy')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[2]).toHaveProperty('status')
    expect(res.body.name).toEqual(config.serviceName)
    expect(res.body.environment).toEqual(config.environment)
    expect(res.body.version).toEqual('test_commit_short')
    expect(res.body.maintenance).toEqual(config.maintenance.serviceUnavailable)
    expect(res.body.dependencies).toStrictEqual([
      {
        name: 's3-bucket',
        status: 'unhealthy'
      },
      {
        name: 'request-api',
        status: 'ok'
      },
      {
        name: 'redis',
        status: 'ok'
      }
    ])
  })

  it('when request api is unhealthy', async () => {
    AWS.S3.mockReturnValue({
      headBucket: vi.fn().mockResolvedValue({})
    })

    const mockClient = {
      connect: vi.fn().mockResolvedValue({}),
      isOpen: true,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Request API is down')))
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body.dependencies).toHaveLength(3)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status', 'unhealthy')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[2]).toHaveProperty('status', 'ok')
    expect(res.body.name).toEqual(config.serviceName)
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
        status: 'unhealthy'
      },
      {
        name: 'redis',
        status: 'ok'
      }
    ])
  })

  it('when redis is unhealthy', async () => {
    AWS.S3.mockReturnValue({
      headBucket: vi.fn().mockResolvedValue({})
    })

    const mockClient = {
      connect: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      isOpen: false,
      quit: vi.fn()
    }
    createClient.mockReturnValue(mockClient)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(500)

    expect(res.body).toHaveProperty('name')
    expect(res.body).toHaveProperty('environment')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('maintenance')
    expect(res.body).toHaveProperty('dependencies')
    expect(res.body.dependencies).toHaveLength(3)
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket')
    expect(res.body.dependencies[0]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api')
    expect(res.body.dependencies[1]).toHaveProperty('status', 'ok')
    expect(res.body.dependencies[2]).toHaveProperty('name', 'redis')
    expect(res.body.dependencies[2]).toHaveProperty('status', 'unhealthy')
    expect(res.body.name).toEqual(config.serviceName)
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
        name: 'redis',
        status: 'unhealthy'
      }
    ])
  })
})
