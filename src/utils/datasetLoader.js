// src/utils/datasetLoader.js
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

    redisClient.on('error', (err) => {
      logger.warn(`datasetLoader/redis error: ${err.message}`)
    })

    try {
      await redisClient.connect()
    } catch (err) {
      logger.warn(`datasetLoader/failed to connect to redis: ${err.message}`)
      redisClient = null
      return null
    }
  }

  return redisClient
}

const CACHE_TTL = 300 // 5min

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

  // normalize order → consistent cache key
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
      logger.warn(`datasetLoader/redis get error: ${err.message}`)
    }
  }

  // fallback → fetch fresh
  nameMap = await fetchDatasetNames(datasetKeys)

  if (client) {
    try {
      await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(nameMap))
    } catch (err) {
      logger.warn(`datasetLoader/redis set error: ${err.message}`)
    }
  }
  return nameMap
}
