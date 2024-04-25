import express from 'express'
import config from '../../config/index.js'
import AWS from 'aws-sdk'
import { createClient } from 'redis'
// import gitCommitInfo from 'git-commit-info'

const router = express.Router()

// const commitInfo = gitCommitInfo()

AWS.config.update({
  region: config.aws.region,
  endpoint: config.aws.endpoint,
  s3ForcePathStyle: config.aws.s3ForcePathStyle || false
})

router.get('/', async (req, res) => {
  const toReturn = {
    name: config.serviceName,
    environment: config.environment,
    version: 'ToDo', // commitInfo.shortHash,
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

  res.json(toReturn)
})

const checkS3Bucket = async () => {
  const s3 = new AWS.S3()
  return await s3.headBucket({ Bucket: config.aws.bucket }).promise()
    .then(() => true)
    .catch(() => false)
}

// ToDo: this should query the request-api health endpoint
const checkRequestApi = async () => {
  try {
    const response = await fetch(config.asyncRequestApi.url)
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
