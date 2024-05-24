import express from 'express'
import config from '../../config/index.js'
import AWS from 'aws-sdk'
import { createClient } from 'redis'

const router = express.Router()

AWS.config.update({
  region: config.aws.region,
  endpoint: config.aws.endpoint,
  s3ForcePathStyle: config.aws.s3ForcePathStyle || false
})

router.get('/', async (req, res) => {
  const toReturn = {
    name: config.serviceName,
    environment: config.environment,
    version: process.env.GIT_COMMIT || 'unknown',
    maintenance: config.maintenance.serviceUnavailable,
    dependencies: [
      {
        name: 's3-bucket',
        status: await checkS3Bucket() ? 'ok' : 'unreachable'
      },
      {
        name: 'request-api',
        status: await checkRequestApi() ? 'ok' : 'unreachable'
      },
      {
        name: 'redis',
        status: await checkRedis() ? 'ok' : 'unreachable'
      }
    ]
  }

  const isAnyServiceUnreachable = toReturn.dependencies.some(service => service.status === 'unreachable')
  if (isAnyServiceUnreachable) {
    res.status(500).json(toReturn)
  } else {
    res.json(toReturn)
  }
})

const checkS3Bucket = async () => {
  const s3 = new AWS.S3()
  return await s3.headBucket({ Bucket: config.aws.bucket }).promise()
    .then(() => true)
    .catch(() => false)
}

const checkRequestApi = async () => {
  try {
    const response = await fetch(`${config.asyncRequestApi.url}/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

const checkRedis = async () => {
  const urlPrefix = `redis${config.redis.secure ? 's' : ''}`
  const client = createClient({
    url: `${urlPrefix}://${config.redis.host}:${config.redis.port}`
  })

  return await client.connect().then(() => {
    if (client.isOpen) {
      client.quit()
      return true
    } else {
      return false
    }
  }).catch((err) => {
    console.log('error:', err)
    return false
  })
}

export default router
export { checkS3Bucket, checkRequestApi, checkRedis }
