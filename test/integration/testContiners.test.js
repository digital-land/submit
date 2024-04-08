import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { LocalstackContainer } from '@testcontainers/localstack'

import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

/*
  This is a test bench made to test the LocalstackContainer class.
  We will use this later on as a starting pointto write better integration tests
*/

describe('LocalstackContainer', () => {
  let container

  beforeAll(async () => {
    container = await new LocalstackContainer('localstack/localstack:latest').start()
  }, 300000) // wait 5 mins as we need to download the localstack image

  afterAll(async () => {
    await container.stop()
  })

  // ToDo: here is an example of testcontainers, to be used at a later date for integration and acceptance testing
  it.skip('should create a S3 bucket', async () => {
    const client = new S3Client({
      endpoint: container.getConnectionUri(),
      forcePathStyle: true,
      region: 'us-east-1',
      credentials: {
        secretAccessKey: 'test',
        accessKeyId: 'test'
      }
    })
    const input = {
      Bucket: 'testcontainers'
    }
    const command = new CreateBucketCommand(input)

    const createBucketResponse = await client.send(command)
    expect(createBucketResponse.$metadata.httpStatusCode).toEqual(200)
    const headBucketResponse = await client.send(new HeadBucketCommand(input))
    expect(headBucketResponse.$metadata.httpStatusCode).toEqual(200)

    await container.stop()
  }, { timeout: 60000 })
})
