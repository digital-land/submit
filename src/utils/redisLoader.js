// src/utils/redisLoader.js
import config from '../../config/index.js'
import { createClient } from 'redis'
import logger from '../utils/logger.js'
import datasette from '../services/datasette.js'

let redisClient

const cacheNamespace = [process.env.DEPLOY_TIME, process.env.GIT_COMMIT].find(Boolean)
const cacheKey = (key) => (cacheNamespace ? `${cacheNamespace}:${key}` : key)

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

const CACHE_TTL = 60 * 60 * 6 // 6 hours
const SYSTEM_FIELDS = new Set([
  'entity',
  'prefix',
  'entry-number',
  'organisation-entity',
  'organisation',
  'IGNORE',
  ''
])

function escapeSqlString (value) {
  return String(value).replaceAll("'", "''")
}

async function getCachedJson (key, logPrefix) {
  const client = await getRedisClient()
  if (!client) return undefined

  try {
    const cached = await client.get(cacheKey(key))
    if (cached) return JSON.parse(cached)
  } catch (err) {
    logger.warn(`${logPrefix}/redis get error: ${err.message}`)
  }

  return undefined
}

async function setCachedJson (key, value, logPrefix, ttl = CACHE_TTL) {
  const client = await getRedisClient()
  if (!client) return

  try {
    await client.setEx(cacheKey(key), ttl, JSON.stringify(value))
  } catch (err) {
    logger.warn(`${logPrefix}/redis set error: ${err.message}`)
  }
}

export function normaliseDatasetFields (rows = [], dataset) {
  return [...new Set(
    rows
      .map(row => row?.field)
      .filter(field => field && !SYSTEM_FIELDS.has(field) && dataset !== field)
  )].sort()
}

export async function getDatasetFields (dataset) {
  if (!dataset) return []

  const key = `dataset-fields:${dataset}`
  const cached = await getCachedJson(key, 'getDatasetFields')
  if (cached) return cached

  const query = `select field from dataset_field where dataset = '${escapeSqlString(dataset)}'`
  const response = await datasette.runQuery(query)
  const fields = normaliseDatasetFields(response.formattedData, dataset)

  await setCachedJson(key, fields, 'getDatasetFields')

  return fields
}

export async function getProvisionReasonsForDataset ({ organisation, dataset }) {
  if (!organisation || !dataset) return []

  const key = `provision-reasons:${organisation}:${dataset}`
  const cached = await getCachedJson(key, 'getProvisionReasonsForDataset')
  if (cached) return cached

  const query = `
    select provision_reason from provision
    where organisation = '${escapeSqlString(organisation)}'
    and dataset = '${escapeSqlString(dataset)}'
    and (
      end_date is null
      or end_date = '')
  `
  const response = await datasette.runQuery(query)
  const provisionReasons = response.formattedData
    .map(row => row?.provision_reason)
    .filter(Boolean)

  await setCachedJson(key, provisionReasons, 'getProvisionReasonsForDataset')

  return provisionReasons
}

export async function isStatutoryDataset ({ organisation, dataset }) {
  const provisionReasons = await getProvisionReasonsForDataset({ organisation, dataset })
  return provisionReasons.includes('statutory')
}

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

  const key = cacheKey(`dataset:${datasetKeys.slice().sort().join(',')}`)
  const client = await getRedisClient()

  if (client) {
    try {
      const cached = await client.get(key)
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
      await client.setEx(key, CACHE_TTL, JSON.stringify(nameMap))
    } catch (err) {
      logger.warn(`redisLoader/redis set error: ${err.message}`)
    }
  }
  return nameMap
}

// Get organisation list, with Redis caching
export async function getOrganisationList () {
  const key = cacheKey('dataset:organisationList')
  const client = await getRedisClient()

  if (client) {
    try {
      const cached = await client.get(key)
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
  const key = cacheKey('dataset:organisationList')
  const client = await getRedisClient()

  if (client) {
    try {
      await client.setEx(key, 60 * 60 * 6, JSON.stringify(organisationList)) // 6 hours
    } catch (err) {
      logger.warn(`setOrganisationList/redis set error: ${err.message}`)
    }
  }
}
