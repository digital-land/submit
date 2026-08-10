// src/utils/redisLoader.js
import config from '../../config/index.js'
import { createClient } from 'redis'
import { createHash, randomUUID } from 'node:crypto'
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

// Build a fixed-length key from the fields that define a duplicate endpoint submission.
// This key deliberately does not use the deployment cache namespace so it survives deployments.
function submittedEndpointKey ({ endpointUrl, dataset, organisation }) {
  const submission = JSON.stringify({ endpointUrl, dataset, organisation })
  const digest = createHash('sha256').update(submission).digest('hex')
  return `submitted-endpoint:${digest}`
}

/**
 * Check whether an endpoint is currently being processed or was submitted recently.
 * Redis failures return false so the existing Datasette duplicate check can still run.
 */
export async function wasEndpointRecentlySubmitted ({ endpointUrl, dataset, organisation }) {
  if (!endpointUrl || !dataset || !organisation) return false

  try {
    const client = await getRedisClient()
    if (!client) return false

    return (await client.exists(submittedEndpointKey({ endpointUrl, dataset, organisation }))) > 0
  } catch (error) {
    logger.warn(`redisLoader/submitted endpoint get error: ${error.message}`)
    return false
  }
}

/**
 * Atomically reserve an endpoint before starting the external submission work.
 * Returns an ownership token when acquired, false when another request owns the
 * reservation, or null when Redis is unavailable and submission should fail open.
 */
export async function reserveSubmittedEndpoint ({ endpointUrl, dataset, organisation }) {
  if (!endpointUrl || !dataset || !organisation) return null

  try {
    const client = await getRedisClient()
    if (!client) return null

    const reservationToken = randomUUID()
    // NX makes checking for an existing submission and acquiring the lock atomic.
    // Only the first concurrent request receives OK and proceeds with submission.
    const result = await client.set(
      submittedEndpointKey({ endpointUrl, dataset, organisation }),
      reservationToken,
      { EX: 2 * 60, NX: true } // Two minutes, so a crashed submission does not block retries for long
    )

    return result === 'OK' ? reservationToken : false
  } catch (error) {
    logger.warn(`redisLoader/submitted endpoint reservation error: ${error.message}`)
    return null
  }
}

/**
 * Keep an owned submission marker for the supplied TTL, or release it when the
 * TTL is zero. The token comparison prevents one request from changing another
 * request's reservation.
 */
export async function settleSubmittedEndpoint ({ endpointUrl, dataset, organisation }, reservationToken, ttl) {
  if (!endpointUrl || !dataset || !organisation || !reservationToken) return

  try {
    const client = await getRedisClient()
    if (!client) return

    await client.eval(
      'if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end if ARGV[2] == "0" then return redis.call("DEL", KEYS[1]) end return redis.call("EXPIRE", KEYS[1], ARGV[2])',
      {
        keys: [submittedEndpointKey({ endpointUrl, dataset, organisation })],
        arguments: [reservationToken, String(ttl)]
      }
    )
  } catch (error) {
    logger.warn(`redisLoader/submitted endpoint settlement error: ${error.message}`)
  }
}

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

export async function isStatutoryDataset (requestParams = {}) {
  const { organisation, dataset } = requestParams ?? {}
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
