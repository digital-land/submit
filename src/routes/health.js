import express from 'express'
import config from '../../config/index.js'
import AWS from 'aws-sdk'
import redis from 'redis'
import childProcess from 'child_process'

const router = express.Router()

router.get('/', async (req, res) => {
  const toReturn = {
    name: config.serviceName,
    environment: config.environment,
    version: getGitHash(),
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
  const client = redis.createClient({
    host: config.redis.host,
    port: config.redis.port
  })

  return await client.connect().then(() => {
    if (client.connected) {
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

const getGitHash = () => {
  return childProcess.execSync('git rev-parse HEAD').toString().trim()
}

export default router
