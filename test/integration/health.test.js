import request from 'supertest';
import express from 'express';
import router from '../../src/routes/health.js';
import { describe, it, expect, vi } from 'vitest'
import AWS from 'aws-sdk'
import { createClient } from 'redis'
import config from '../../config/index.js'

const app = express();
app.use('/', router);

vi.mock('aws-sdk')
vi.mock('redis')

describe('GET /', () => {

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

  process.env.GIT_COMMIT = 'test_commit_short'

  it('should return service health status', async () => {
    const res = await request(app)
      .get('/')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('maintenance');
    expect(res.body).toHaveProperty('dependencies');
    expect(res.body.dependencies).toHaveLength(3);
    expect(res.body.dependencies[0]).toHaveProperty('name', 's3-bucket');
    expect(res.body.dependencies[0]).toHaveProperty('status');
    expect(res.body.dependencies[1]).toHaveProperty('name', 'request-api');
    expect(res.body.dependencies[1]).toHaveProperty('status');
    expect(res.body.dependencies[2]).toHaveProperty('name', 'redis');
    expect(res.body.dependencies[2]).toHaveProperty('status');

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
    
  });
});