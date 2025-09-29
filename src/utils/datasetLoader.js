// src/utils/datasetLoader.js
import config from '../../config/index.js'
import { createClient } from 'redis'
import logger from '../utils/logger.js'

let redisClient
let redisClientConnecting
export async function getRedisClient () {
  if (!config.redis) return null
  if (redisClient?.isOpen) return redisClient
  if (!redisClientConnecting) {
    const scheme = `redis${config.redis.secure ? 's' : ''}`
    const urlStr = config.redis.url ?? `${scheme}://${config.redis.host}:${config.redis.port}`
    const url = new URL(urlStr)
    if (config.redis.username) url.username = config.redis.username
    if (config.redis.password) url.password = config.redis.password
    redisClient = createClient({ url: url.toString() })
    redisClient.on('error', (err) => {
      logger.warn(`datasetLoader/redis error: ${err.message}`)
    })
    // Store the promise for the in-flight connect, log & reset on failure
    redisClientConnecting = redisClient.connect()
      .catch((err) => {
        logger.warn(`datasetLoader/failed to connect to redis: ${err.message}`)
        redisClient = null
        throw err
      })
      .finally(() => {
        redisClientConnecting = undefined
      })
  }
  // Wait for the single connection attempt to finish
  try {
    await redisClientConnecting
  } catch {
    return null
  }
  return redisClient?.isOpen ? redisClient : null
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
  let fetchedNameMap = {}
  try {
    fetchedNameMap = await fetchDatasetNames(datasetKeys)
  } catch (err) {
    logger.warn(`datasetLoader/fetch error: ${err.message}`)
  }
  nameMap = Object.fromEntries(
    datasetKeys.map(key => [key, fetchedNameMap[key] ?? key])
  )
  if (client && Object.keys(fetchedNameMap).length) {
    try {
      await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(nameMap))
    } catch (err) {
      logger.warn(`datasetLoader/redis set error: ${err.message}`)
    }
  }
  return nameMap
}
