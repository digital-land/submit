// src/utils/redisLoader.js
import config from '../../config/index.js'
import { createClient } from 'redis'
import logger from '../utils/logger.js'

let redisClient

export async function getRedisClient () {
  if (!config.redis) return null

  if (!redisClient) {
    const urlPrefix = `redis${config.redis.secure ? 's' : ''}`
    redisClient = createClient({
      url: `${urlPrefix}://${config.redis.host}:${config.redis.port}`
    })

    try {
      await redisClient.connect()
    } catch (err) {
      logger.warn(`redisLoader/failed to connect to redis: ${err.message}`)
      redisClient = null
      return null
    }
  }

  // Catch if it disconnects later
  if (redisClient && !redisClient.isOpen) {
    logger.warn('Redis client is disconnected, resetting')
    redisClient = null
    return null
  }

  return redisClient
}

const CACHE_TTL = 300 // 5min

// TODO: future removal of this function in favour of using datasetNameSlug and datasetSubjectLoaded instead.
export async function fetchDatasetNames (datasetKeys) {
  if (!datasetKeys?.length) return {}
  const params = new URLSearchParams()
  datasetKeys.forEach(d => params.append('dataset', d))

  const res = await fetch(
    `${config.mainWebsiteUrl}/dataset.json?${params.toString()}&field=dataset&field=name&include_typologies=false`,
    { headers: { 'user-agent': 'Planning Data Provide' } }
  )
  if (!res.ok) throw new Error(`Failed to fetch datasets from API: ${res.statusText}`)

  const data = await res.json()
  const { datasets } = data || {}
  if (!Array.isArray(datasets)) {
    throw new Error('Invalid API response: datasets is not an array')
  }

  return Object.fromEntries(
    datasets
      .filter(d => d && d.dataset && d.name)
      .map(d => [d.dataset, d.name])
  )
}

export async function getDatasetNameMap (datasetKeys) {
  let nameMap = {}
  if (!Array.isArray(datasetKeys) || !datasetKeys.length) return {}

  const cacheKey = `dataset:${datasetKeys.slice().sort().join(',')}`
  const client = await getRedisClient()

  if (client) {
    try {
      const cached = await client.get(cacheKey)
      if (cached) {
        nameMap = JSON.parse(cached)
        return nameMap
      }
    } catch (err) {
      logger.warn(`redisLoader/redis get error: ${err.message}`)
    }
  }

  // fallback → fetch fresh
  nameMap = await fetchDatasetNames(datasetKeys)

  if (client) {
    try {
      await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(nameMap))
    } catch (err) {
      logger.warn(`redisLoader/redis set error: ${err.message}`)
    }
  }
  return nameMap
}

// Get organisation list, with Redis caching
export async function getOrganisationList () {
  const cacheKey = 'dataset:organisationList'
  const client = await getRedisClient()

  if (client) {
    try {
      const cached = await client.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      } else {
        return false
      }
    } catch (err) {
      logger.warn(`organisationList/redis get error: ${err.message}`)
    }
  }
  return false
}

// Set organisation list, with Redis caching
export async function setOrganisationList (organisationList) {
  const cacheKey = 'dataset:organisationList'
  const client = await getRedisClient()

  if (client) {
    try {
      await client.setEx(cacheKey, 60 * 60 * 6, JSON.stringify(organisationList)) // 6 hours
    } catch (err) {
      logger.warn(`setOrganisationList/redis set error: ${err.message}`)
    }
  }
}
